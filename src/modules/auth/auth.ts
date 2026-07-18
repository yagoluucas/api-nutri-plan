import { NextFunction, Request, Response, Router } from "express";
import Nutricionista from "../../database/nutricionista.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import {
  AuthResult,
  AuthTokens,
  ILoginUserSchema,
  ILogoutRequestSchema,
  IRefreshTokenRequestSchema,
} from "../../interfaces/auth/authInterfaces.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { INutricionistaSchema } from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  loginRateLimiter,
  registerRateLimiter,
} from "../../middlewares/rateLimit.js";
import { existeConflitoIdentidadeNutricionista } from "../nutricionista/nutricionistaHelpers.js";
import {
  criarSessao,
  revogarSessaoPorRefreshToken,
  revogarTodasSessoes,
  rotacionarSessao,
} from "./sessionService.js";
import {
  createSearchHash,
  normalizeCrnForSearch,
  normalizeEmailForSearch,
} from "../../utils/searchHash.js";

const authRouter = Router();

function setSessionHeaders(res: Response, tokens: AuthTokens) {
  res.set("Authorization", `Bearer ${tokens.accessToken}`);
  res.set("X-Refresh-Token", tokens.refreshToken);
  res.set(
    "X-Access-Token-Expires-In",
    String(tokens.accessTokenExpiresInSeconds),
  );
  res.set(
    "X-Refresh-Token-Expires-In",
    String(tokens.refreshTokenExpiresInSeconds),
  );
}

function conflitoNutricionistaError() {
  return new Error("Nutricionista ja cadastrado, tente novamente", {
    cause: {
      cause: "Conflict",
      statusCode: 422,
    } as IErrorCause,
  });
}

function credenciaisInvalidasError() {
  return new Error("Email ou senha invalidos, confira os dados e tente novamente", {
    cause: {
      cause: "Authentication Failed",
      internalCause: "Invalid Credentials",
      statusCode: 401,
    } as IErrorCause,
  });
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

async function register(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<AuthResult | void> {
  const nutricionistSafe = INutricionistaSchema.safeParse(
    req.body?.nutricionista,
  );

  if (!nutricionistSafe.success) {
    next(nutricionistSafe.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();
    const emailHash = createSearchHash(
      normalizeEmailForSearch(nutricionistSafe.data.email),
    );
    const crnHash = createSearchHash(
      normalizeCrnForSearch(nutricionistSafe.data.crn),
    );

    const nutricionistExist = await existeConflitoIdentidadeNutricionista({
      email: nutricionistSafe.data.email,
      crn: nutricionistSafe.data.crn,
    });

    if (nutricionistExist) {
      next(conflitoNutricionistaError());
      return;
    }

    const createNutricionist = await Nutricionista.create({
      ...nutricionistSafe.data,
      dataNascimento: nutricionistSafe.data.dataNascimento.toISOString(),
      emailHash,
      crnHash,
    });
    const tokens = await criarSessao(createNutricionist._id.toString());

    return {
      tokens,
      body: {
        message: "Nutricionista cadastrado com sucesso",
        error: false,
        statusCode: 201,
        user: {
          id: createNutricionist._id.toString(),
          nome: createNutricionist.getNomeDescriptografado(),
          email: createNutricionist.getEmailDescriptografado(),
        },
      },
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      next(conflitoNutricionistaError());
      return;
    }

    next(error);
  }
}

async function login(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<AuthResult | void> {
  const safeUser = ILoginUserSchema.safeParse(req.body?.userLogin);

  if (!safeUser.success) {
    next(safeUser.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();
    const normalizedEmail = normalizeEmailForSearch(safeUser.data.email);
    const emailHash = createSearchHash(normalizedEmail);

    const user = await Nutricionista.findOne({
      $or: [{ emailHash }, { email: normalizedEmail }],
    }).select("+senha +emailHash +crnHash");

    if (!user) {
      next(credenciaisInvalidasError());
      return;
    }

    const isPasswordValid = await user.validarSenha(safeUser.data.senha);

    if (!isPasswordValid) {
      next(credenciaisInvalidasError());
      return;
    }

    if (!user.emailHash || !user.crnHash || user.email === normalizedEmail) {
      await user.save({ validateModifiedOnly: true });
    }

    const tokens = await criarSessao(user._id.toString());

    return {
      tokens,
      body: {
        message: "Login realizado com sucesso",
        error: false,
        statusCode: 200,
        user: {
          id: user._id.toString(),
          nome: user.getNomeDescriptografado(),
          email: user.getEmailDescriptografado(),
        },
      },
    };
  } catch (error) {
    next(error);
  }
}

async function refresh(req: Request, res: Response, next: NextFunction) {
  const refreshTokenSafe = IRefreshTokenRequestSchema.safeParse(req.body);

  if (!refreshTokenSafe.success) {
    next(refreshTokenSafe.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();
    const tokens = await rotacionarSessao(
      refreshTokenSafe.data.refreshToken,
    );

    setSessionHeaders(res, tokens);

    return res.status(200).json({
      message: "Sessao renovada com sucesso",
      error: false,
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req: Request, res: Response, next: NextFunction) {
  const logoutSafe = ILogoutRequestSchema.safeParse(req.body ?? {});

  if (!logoutSafe.success) {
    next(logoutSafe.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();
    await revogarSessaoPorRefreshToken(logoutSafe.data.refreshToken);

    return res.status(200).json({
      message: "Logout realizado com sucesso",
      error: false,
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
}

async function logoutAll(req: Request, res: Response, next: NextFunction) {
  const idNutricionista = req.nutricionistaId;

  if (!idNutricionista) {
    next(
      new Error("Nao autorizado", {
        cause: {
          cause: "Authentication Failed",
          internalCause: "Invalid Token",
          statusCode: 401,
        } as IErrorCause,
      }),
    );
    return;
  }

  try {
    await conectarAoBancoDeDados();
    await revogarTodasSessoes(idNutricionista);

    return res.status(200).json({
      message: "Todas as sessoes foram encerradas",
      error: false,
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
}

authRouter.post("/register", registerRateLimiter, async (req, res, next) => {
  const returnAuth = await register(req, res, next);

  if (returnAuth) {
    setSessionHeaders(res, returnAuth.tokens);
    return res.status(returnAuth.body.statusCode).json(returnAuth.body);
  }
});

authRouter.post("/login", loginRateLimiter, async (req, res, next) => {
  const returnAuth = await login(req, res, next);

  if (returnAuth) {
    setSessionHeaders(res, returnAuth.tokens);
    return res.status(returnAuth.body.statusCode).json(returnAuth.body);
  }
});

authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.post("/logout-all", authMiddleware, logoutAll);

export { authRouter };
