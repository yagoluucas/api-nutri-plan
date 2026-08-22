import { NextFunction, Request, Response } from "express";
import Nutricionista from "../database/nutricionista.js";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";
import { IErrorCause } from "../interfaces/errors/erros.js";
import { sessaoEstaAtiva } from "../modules/auth/sessionService.js";
import { verificarAccessToken } from "../utils/authTokens.js";
import { isValidString } from "../utils/utils.js";

function authenticationError() {
  return new Error("Nao autorizado", {
    cause: {
      cause: "Authentication Failed",
      internalCause: "Invalid Token",
      statusCode: 401,
    } as IErrorCause,
  });
}

function setPrivateNoStoreHeaders(res: Response) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function getBearerToken(req: Request) {
  const authHeader = req.headers?.authorization;

  if (isValidString(authHeader)) {
    const [bearer, token] = authHeader.split(" ");

    if (
      isValidString(bearer) &&
      bearer.toLowerCase() === "bearer" &&
      isValidString(token)
    ) {
      return token;
    }
  }

  return null;
}

async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  setPrivateNoStoreHeaders(res);

  try {
    const token = getBearerToken(req);

    if (!token) {
      next(authenticationError());
      return;
    }

    let parsedToken;

    try {
      parsedToken = verificarAccessToken(token);
    } catch {
      next(authenticationError());
      return;
    }

    await conectarAoBancoDeDados();

    const activeSession = await sessaoEstaAtiva(
      parsedToken.sessionId,
      parsedToken.id,
    );

    if (!activeSession) {
      next(authenticationError());
      return;
    }

    const userExists = await Nutricionista.exists({
      _id: parsedToken.id,
      archivedAt: { $exists: false },
    });

    if (!userExists) {
      next(authenticationError());
      return;
    }

    req.nutricionistaId = parsedToken.id;
    req.sessionId = parsedToken.sessionId;
    next();
  } catch (error) {
    next(error);
  }
}

export { authMiddleware, setPrivateNoStoreHeaders };
