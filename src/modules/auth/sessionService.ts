import mongoose from "mongoose";
import Sessao from "../../database/sessao.js";
import { AuthTokens } from "../../interfaces/auth/authInterfaces.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  criarTokensSessao,
  hashRefreshToken,
  hashesIguais,
  verificarRefreshToken,
} from "../../utils/authTokens.js";

const REFRESH_ROTATION_GRACE_MS = 15_000;

function authenticationError(message = "Sessao invalida ou expirada") {
  return new Error(message, {
    cause: {
      cause: "Authentication Failed",
      internalCause: "Invalid Token",
      statusCode: 401,
    } as IErrorCause,
  });
}

function refreshConflictError() {
  return new Error("Renovacao de sessao em andamento", {
    cause: {
      cause: "Conflict",
      internalCause: "Invalid Token",
      statusCode: 409,
    } as IErrorCause,
  });
}

async function criarSessao(idNutricionista: string): Promise<AuthTokens> {
  const sessionId = new mongoose.Types.ObjectId();
  const tokens = criarTokensSessao(idNutricionista, sessionId.toString());

  await Sessao.create({
    _id: sessionId,
    nutricionistaId: idNutricionista,
    refreshTokenHash: hashRefreshToken(tokens.refreshToken),
    expiresAt: tokens.refreshTokenExpiresAt,
    lastUsedAt: new Date(),
  });

  return tokens;
}

async function rotacionarSessao(refreshToken: string): Promise<AuthTokens> {
  let payload;

  try {
    payload = verificarRefreshToken(refreshToken);
  } catch {
    throw authenticationError();
  }

  const now = new Date();
  const currentHash = hashRefreshToken(refreshToken);
  const session = await Sessao.findOne({
    _id: payload.sessionId,
    nutricionistaId: payload.id,
  }).select("+refreshTokenHash +previousRefreshTokenHash");

  if (!session || session.revokedAt || session.expiresAt <= now) {
    throw authenticationError();
  }

  if (
    session.previousRefreshTokenHash &&
    session.previousValidUntil &&
    session.previousValidUntil > now &&
    hashesIguais(session.previousRefreshTokenHash, currentHash)
  ) {
    throw refreshConflictError();
  }

  if (!hashesIguais(session.refreshTokenHash, currentHash)) {
    session.revokedAt = now;
    await session.save({ validateModifiedOnly: true });
    throw authenticationError();
  }

  const tokens = criarTokensSessao(payload.id, payload.sessionId);
  const newHash = hashRefreshToken(tokens.refreshToken);
  const previousValidUntil = new Date(
    now.getTime() + REFRESH_ROTATION_GRACE_MS,
  );

  const updatedSession = await Sessao.findOneAndUpdate(
    {
      _id: payload.sessionId,
      nutricionistaId: payload.id,
      refreshTokenHash: currentHash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: now },
    },
    {
      $set: {
        refreshTokenHash: newHash,
        previousRefreshTokenHash: currentHash,
        previousValidUntil,
        expiresAt: tokens.refreshTokenExpiresAt,
        lastUsedAt: now,
      },
    },
    { returnDocument: "after" },
  ).select("+previousRefreshTokenHash");

  if (updatedSession) {
    return tokens;
  }

  const sessionAfterRace = await Sessao.findOne({
    _id: payload.sessionId,
    nutricionistaId: payload.id,
  }).select("+previousRefreshTokenHash");

  if (
    sessionAfterRace?.previousRefreshTokenHash &&
    sessionAfterRace.previousValidUntil &&
    sessionAfterRace.previousValidUntil > new Date() &&
    hashesIguais(sessionAfterRace.previousRefreshTokenHash, currentHash)
  ) {
    throw refreshConflictError();
  }

  throw authenticationError();
}

async function revogarSessaoPorRefreshToken(refreshToken?: string) {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verificarRefreshToken(refreshToken);

    await Sessao.updateOne(
      {
        _id: payload.sessionId,
        nutricionistaId: payload.id,
        revokedAt: { $exists: false },
      },
      {
        $set: { revokedAt: new Date() },
      },
    );
  } catch {
    // Logout e idempotente: um token invalido ou expirado nao deve impedir
    // o cliente de limpar os cookies locais.
  }
}

async function revogarTodasSessoes(idNutricionista: string) {
  await Sessao.updateMany(
    {
      nutricionistaId: idNutricionista,
      revokedAt: { $exists: false },
    },
    {
      $set: { revokedAt: new Date() },
    },
  );
}

async function sessaoEstaAtiva(
  sessionId: string,
  idNutricionista: string,
) {
  const session = await Sessao.exists({
    _id: sessionId,
    nutricionistaId: idNutricionista,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  return Boolean(session);
}

export {
  criarSessao,
  rotacionarSessao,
  revogarSessaoPorRefreshToken,
  revogarTodasSessoes,
  sessaoEstaAtiva,
};
