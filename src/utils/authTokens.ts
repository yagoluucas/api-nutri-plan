import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { obterChaveSensivel } from "../config/secrets.js";
import {
  AuthTokens,
  IAccessTokenPayloadSchema,
  IRefreshTokenPayloadSchema,
} from "../interfaces/auth/authInterfaces.js";
import { IErrorCause } from "../interfaces/errors/erros.js";

const DEFAULT_ACCESS_TOKEN_DURATION = "15m";
const DEFAULT_REFRESH_TOKEN_DURATION = "7d";
const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/i;

function configurationError(message: string) {
  return new Error(message, {
    cause: {
      cause: "Internal Server Error",
      internalCause: "Unexpected Error",
      statusCode: 500,
    } as IErrorCause,
  });
}

function getRequiredSecret(name: "JWT_SECRET" | "JWT_REFRESH_SECRET") {
  try {
    return obterChaveSensivel(name);
  } catch {
    throw configurationError(`${name} nao configurada.`);
  }
}

function durationToSeconds(value: string, fallback: string) {
  const normalizedValue = value.trim() || fallback;
  const match = DURATION_PATTERN.exec(normalizedValue);

  if (!match) {
    throw configurationError(
      `Duracao de token invalida: ${normalizedValue}. Use s, m, h ou d.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };
  const multiplier = multipliers[unit];

  if (!multiplier) {
    throw configurationError(`Unidade de duracao invalida: ${unit}.`);
  }

  return amount * multiplier;
}

function getAccessTokenExpiresInSeconds() {
  return durationToSeconds(
    process.env.ACCESS_TOKEN_EXPIRES_IN ||
      process.env.JWT_EXPIRES_IN ||
      DEFAULT_ACCESS_TOKEN_DURATION,
    DEFAULT_ACCESS_TOKEN_DURATION,
  );
}

function getRefreshTokenExpiresInSeconds() {
  return durationToSeconds(
    process.env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_DURATION,
    DEFAULT_REFRESH_TOKEN_DURATION,
  );
}

function criarTokensSessao(
  idNutricionista: string,
  sessionId: string,
): AuthTokens {
  const accessTokenExpiresInSeconds = getAccessTokenExpiresInSeconds();
  const refreshTokenExpiresInSeconds = getRefreshTokenExpiresInSeconds();

  const accessToken = jwt.sign(
    {
      id: idNutricionista,
      sessionId,
      type: "access",
    },
    getRequiredSecret("JWT_SECRET"),
    { expiresIn: accessTokenExpiresInSeconds },
  );

  const refreshToken = jwt.sign(
    {
      id: idNutricionista,
      sessionId,
      type: "refresh",
    },
    getRequiredSecret("JWT_REFRESH_SECRET"),
    { expiresIn: refreshTokenExpiresInSeconds },
  );

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresInSeconds,
    refreshTokenExpiresInSeconds,
    refreshTokenExpiresAt: new Date(
      Date.now() + refreshTokenExpiresInSeconds * 1_000,
    ),
  };
}

function verificarAccessToken(token: string) {
  const decoded = jwt.verify(token, getRequiredSecret("JWT_SECRET"));
  return IAccessTokenPayloadSchema.parse(decoded);
}

function verificarRefreshToken(token: string) {
  const decoded = jwt.verify(token, getRequiredSecret("JWT_REFRESH_SECRET"));
  return IRefreshTokenPayloadSchema.parse(decoded);
}

function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashesIguais(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export {
  criarTokensSessao,
  verificarAccessToken,
  verificarRefreshToken,
  hashRefreshToken,
  hashesIguais,
};
