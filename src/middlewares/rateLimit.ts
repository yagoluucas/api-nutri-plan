import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getRedisClient } from "../config/redis.js";
import { obterChaveSensivel } from "../config/secrets.js";
import { IErrorCause } from "../interfaces/errors/erros.js";

type RateLimitPolicy = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  message: string;
};

type RateLimitState = {
  count: number;
  remaining: number;
  retryAfterSeconds: number;
  blocked: boolean;
};

const GLOBAL_POLICY: RateLimitPolicy = {
  keyPrefix: "global",
  limit: 300,
  windowSeconds: 15 * 60,
  message: "Muitas requisicoes. Tente novamente mais tarde.",
};

const READ_POLICY: RateLimitPolicy = {
  keyPrefix: "read",
  limit: 120,
  windowSeconds: 60,
  message: "Muitas consultas em pouco tempo. Tente novamente mais tarde.",
};

const WRITE_POLICY: RateLimitPolicy = {
  keyPrefix: "write",
  limit: 30,
  windowSeconds: 15 * 60,
  message: "Muitas alteracoes em pouco tempo. Tente novamente mais tarde.",
};

const LOGIN_POLICY: RateLimitPolicy = {
  keyPrefix: "login-failures",
  limit: 5,
  windowSeconds: 15 * 60,
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
};

const LOGIN_BLOCK_SECONDS = 15 * 60;

const REGISTER_POLICY: RateLimitPolicy = {
  keyPrefix: "register",
  limit: 3,
  windowSeconds: 60 * 60,
  message: "Muitas tentativas de cadastro. Tente novamente mais tarde.",
};

const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return { count, ttl }
`;

function getRateLimitKey(req: Request, policy: RateLimitPolicy) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const secret = obterChaveSensivel("JWT_SECRET");

  const ipHash = crypto
    .createHmac("sha256", secret)
    .update(ip)
    .digest("hex");

  return `nutri-plan:rate-limit:${policy.keyPrefix}:${ipHash}`;
}

function createRateLimitError(message: string) {
  return new Error(message, {
    cause: {
      cause: "Internal Server Error",
      internalCause: "Unexpected Error",
      statusCode: 503,
    } as IErrorCause,
  });
}

function getRetryAfterSeconds(ttl: number, fallback: number) {
  return ttl > 0 ? ttl : fallback;
}

function stateFromValues(
  count: number,
  ttl: number,
  policy: RateLimitPolicy,
): RateLimitState {
  const retryAfterSeconds = getRetryAfterSeconds(ttl, policy.windowSeconds);

  return {
    count,
    remaining: Math.max(0, policy.limit - count),
    retryAfterSeconds,
    blocked: count >= policy.limit,
  };
}

async function incrementRateLimit(
  req: Request,
  policy: RateLimitPolicy,
): Promise<RateLimitState> {
  const redisClient = await getRedisClient();
  const result = await redisClient.eval(INCREMENT_SCRIPT, {
    keys: [getRateLimitKey(req, policy)],
    arguments: [String(policy.windowSeconds)],
  });
  const values = Array.isArray(result) ? result : [];
  const count = Number(values[0]);
  const ttl = Number(values[1]);

  if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
    throw new Error("Resposta invalida do Redis.");
  }

  return stateFromValues(count, ttl, policy);
}

async function readRateLimit(
  req: Request,
  policy: RateLimitPolicy,
): Promise<RateLimitState> {
  const redisClient = await getRedisClient();
  const key = getRateLimitKey(req, policy);
  const countValue = await redisClient.get(key);
  const ttl = await redisClient.ttl(key);
  const count = countValue ? Number(countValue) : 0;

  if (!Number.isFinite(count)) {
    throw new Error("Contador invalido no Redis.");
  }

  return stateFromValues(count, ttl, policy);
}

function getLoginBlockKey(req: Request) {
  return getRateLimitKey(req, {
    ...LOGIN_POLICY,
    keyPrefix: "login-block",
  });
}

async function readLoginRateLimit(req: Request) {
  const redisClient = await getRedisClient();
  const blockTtl = await redisClient.ttl(getLoginBlockKey(req));

  if (blockTtl > 0) {
    return stateFromValues(LOGIN_POLICY.limit, blockTtl, LOGIN_POLICY);
  }

  const state = await readRateLimit(req, LOGIN_POLICY);

  if (state.blocked) {
    await redisClient.set(getLoginBlockKey(req), "1", {
      EX: LOGIN_BLOCK_SECONDS,
    });

    return stateFromValues(
      LOGIN_POLICY.limit,
      LOGIN_BLOCK_SECONDS,
      LOGIN_POLICY,
    );
  }

  return state;
}

function applyRateLimitHeaders(
  res: Response,
  policy: RateLimitPolicy,
  state: RateLimitState,
) {
  res.setHeader("RateLimit-Limit", String(policy.limit));
  res.setHeader("RateLimit-Remaining", String(state.remaining));
  res.setHeader("RateLimit-Reset", String(state.retryAfterSeconds));

  if (state.blocked) {
    res.setHeader("Retry-After", String(state.retryAfterSeconds));
  }
}

function rateLimitResponse(
  res: Response,
  policy: RateLimitPolicy,
  state: RateLimitState,
) {
  applyRateLimitHeaders(res, policy, state);
  return res.status(429).json({
    message: policy.message,
    error: true,
    statusCode: 429,
  });
}

function isPublicPath(req: Request) {
  return req.path === "/health" || req.method === "OPTIONS";
}

function createCategoryRateLimiter(
  policy: RateLimitPolicy,
  shouldLimit: (req: Request) => boolean,
) {
  return async function categoryRateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (isPublicPath(req) || !shouldLimit(req)) {
      next();
      return;
    }

    try {
      const state = await incrementRateLimit(req, policy);
      applyRateLimitHeaders(res, policy, state);

      if (state.blocked) {
        rateLimitResponse(res, policy, state);
        return;
      }

      next();
    } catch {
      next(createRateLimitError("Servico de protecao temporariamente indisponivel."));
    }
  };
}

const globalRateLimiter = createCategoryRateLimiter(
  GLOBAL_POLICY,
  () => true,
);

const readRateLimiter = createCategoryRateLimiter(
  READ_POLICY,
  (req) => req.method === "GET" && !req.path.startsWith("/auth"),
);

const writeRateLimiter = createCategoryRateLimiter(
  WRITE_POLICY,
  (req) =>
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    !req.path.startsWith("/auth"),
);

const loginRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const state = await readLoginRateLimit(req);
    applyRateLimitHeaders(res, LOGIN_POLICY, state);

    if (state.blocked) {
      return res.status(429).json({
        message: `Muitas tentativas de login. Tente novamente em ${formatDuration(state.retryAfterSeconds)}.`,
        error: true,
        statusCode: 429,
      });
    }

    next();
  } catch {
    next(createRateLimitError("Servico de protecao temporariamente indisponivel."));
  }
};

const registerRateLimiter = createCategoryRateLimiter(
  REGISTER_POLICY,
  () => true,
);

async function registerLoginFailure(req: Request, res: Response) {
  const state = await incrementRateLimit(req, LOGIN_POLICY);

  if (state.blocked) {
    const redisClient = await getRedisClient();
    await redisClient.set(getLoginBlockKey(req), "1", {
      EX: LOGIN_BLOCK_SECONDS,
    });

    const blockedState = stateFromValues(
      LOGIN_POLICY.limit,
      LOGIN_BLOCK_SECONDS,
      LOGIN_POLICY,
    );
    applyRateLimitHeaders(res, LOGIN_POLICY, blockedState);
    return blockedState;
  }

  applyRateLimitHeaders(res, LOGIN_POLICY, state);
  return state;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function getLoginRemainingMessage(state: RateLimitState) {
  if (state.blocked) {
    return `Credenciais invalidas. Seu IP foi bloqueado por ${formatDuration(state.retryAfterSeconds)}.`;
  }

  const tentativa = state.remaining === 1 ? "tentativa" : "tentativas";
  return `Credenciais invalidas. Voce tem mais ${state.remaining} ${tentativa} antes de ser bloqueado por ${formatDuration(state.retryAfterSeconds)}.`;
}

export {
  globalRateLimiter,
  getLoginRemainingMessage,
  loginRateLimiter,
  readRateLimiter,
  registerLoginFailure,
  registerRateLimiter,
  writeRateLimiter,
};
