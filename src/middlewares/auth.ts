import { NextFunction, Request, Response } from "express";
import Nutricionista from "../database/nutricionista.js";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";
import { IErrorCause } from "../interfaces/errors/erros.js";
import { INutricionistaSchema } from "../interfaces/usuarios/nutricionistaInterfaces.js";
import { sessaoEstaAtiva } from "../modules/auth/sessionService.js";
import { verificarAccessToken } from "../utils/authTokens.js";
import { isValidString } from "../utils/utils.js";

const AUTH_COOKIE_NAMES = [
  "accessToken",
  "__Host-accessToken",
  "nutriplan_token",
];

function authenticationError() {
  return new Error("Nao autorizado", {
    cause: {
      cause: "Authentication Failed",
      internalCause: "Invalid Token",
      statusCode: 401,
    } as IErrorCause,
  });
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

  for (const cookieName of AUTH_COOKIE_NAMES) {
    const token = req.cookies?.[cookieName];

    if (isValidString(token)) {
      return token;
    }
  }

  return null;
}

async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
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

    const parsedUser = INutricionistaSchema.partial().safeParse(
      await Nutricionista.findById(parsedToken.id),
    );

    if (!parsedUser.success) {
      next(authenticationError());
      return;
    }

    req.user = parsedUser.data;
    req.nutricionistaId = parsedToken.id;
    next();
  } catch (error) {
    next(error);
  }
}

export { authMiddleware };
