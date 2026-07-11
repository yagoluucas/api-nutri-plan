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
import {
  criarSessao,
  revogarSessaoPorRefreshToken,
  revogarTodasSessoes,
  rotacionarSessao,
} from "./sessionService.js";

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

    const nutricionistExist = await Nutricionista.findOne({
      email: nutricionistSafe.data.email,
    });

    if (nutricionistExist) {
      next(
        new Error("Nutricionista ja cadastrado, tente novamente", {
          cause: {
            cause: "Conflict",
            statusCode: 422,
          } as IErrorCause,
        }),
      );
      return;
    }

    const createNutricionist = await Nutricionista.create(
      nutricionistSafe.data,
    );
    const tokens = await criarSessao(createNutricionist._id.toString());

    return {
      tokens,
      body: {
        message: "Nutricionista cadastrado com sucesso",
        error: false,
        statusCode: 201,
        user: {
          id: createNutricionist._id.toString(),
          nome: createNutricionist.nome,
          email: createNutricionist.email,
        },
      },
    };
  } catch (error) {
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

    const user = await Nutricionista.findOne({
      email: safeUser.data.email,
    }).select("+senha");

    if (!user) {
      next(
        new Error(
          "Email ou senha invalidos, confira os dados e tente novamente",
          {
            cause: {
              cause: "Authentication Failed",
              internalCause: "Invalid Credentials",
              statusCode: 401,
            } as IErrorCause,
          },
        ),
      );
      return;
    }

    const isPasswordValid = await user.validarSenha(safeUser.data.senha);

    if (!isPasswordValid) {
      next(
        new Error(
          "Email ou senha invalidos, confira os dados e tente novamente",
          {
            cause: {
              cause: "Authentication Failed",
              internalCause: "Invalid Credentials",
              statusCode: 401,
            } as IErrorCause,
          },
        ),
      );
      return;
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
          nome: user.nome,
          email: user.email,
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
