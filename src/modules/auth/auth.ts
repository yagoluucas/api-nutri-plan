import bcrypt from "bcrypt";
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
import {
  IConfirmRegistrationSchema,
  IResendRegistrationEmailSchema,
} from "../../interfaces/auth/emailConfirmationInterfaces.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { INutricionistaSchema } from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import {
  authMiddleware,
  setPrivateNoStoreHeaders,
} from "../../middlewares/auth.js";
import {
  getLoginRemainingMessage,
  loginRateLimiter,
  registerConfirmRateLimiter,
  registerLoginFailure,
  registerRateLimiter,
  registerResendRateLimiter,
} from "../../middlewares/rateLimit.js";
import {
  criarSessao,
  revogarSessaoAtual,
  revogarTodasSessoes,
  rotacionarSessao,
} from "./sessionService.js";
import {
  createSearchHash,
  normalizeEmailForSearch,
} from "../../utils/searchHash.js";
import {
  confirmarCadastro,
  iniciarCadastro,
  reenviarConfirmacao,
} from "./registrationService.js";

const authRouter = Router();

// Mantem o custo do bcrypt quando o e-mail nao esta cadastrado, reduzindo
// a diferenca de tempo que poderia permitir enumeracao de contas.
const DUMMY_PASSWORD_HASH =
  "$2b$10$AqiznTPwtwgLDpGd17ZwtufwzmoBZYs5arz3xOFngkWJz7G5SgXQ6";

function setSessionHeaders(res: Response, tokens: AuthTokens) {
  setPrivateNoStoreHeaders(res);
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

function credenciaisInvalidasError(message: string) {
  return new Error(message, {
    cause: {
      cause: "Authentication Failed",
      internalCause: "Invalid Credentials",
      statusCode: 401,
    } as IErrorCause,
  });
}

async function register(
  req: Request,
  next: NextFunction,
) {
  const nutricionistSafe = INutricionistaSchema.safeParse(
    req.body?.nutricionista,
  );

  if (!nutricionistSafe.success) {
    next(nutricionistSafe.error);
    return;
  }

  try {
    return await iniciarCadastro(nutricionistSafe.data, req);
  } catch (error) {
    next(error);
  }
}

async function resendRegistration(
  req: Request,
  next: NextFunction,
) {
  const resendSafe = IResendRegistrationEmailSchema.safeParse(req.body);

  if (!resendSafe.success) {
    next(resendSafe.error);
    return;
  }

  try {
    return await reenviarConfirmacao(resendSafe.data.email, req);
  } catch (error) {
    next(error);
  }
}

async function confirmRegistration(
  req: Request,
  next: NextFunction,
) {
  const confirmationSafe = IConfirmRegistrationSchema.safeParse(req.body);

  if (!confirmationSafe.success) {
    next(confirmationSafe.error);
    return;
  }

  try {
    return await confirmarCadastro(confirmationSafe.data.token);
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
    const normalizedEmail = normalizeEmailForSearch(safeUser.data.email);
    const emailHash = createSearchHash(normalizedEmail);

    const user = await Nutricionista.findOne({
      $and: [
        { $or: [{ emailHash }, { email: normalizedEmail }] },
        { archivedAt: { $exists: false } },
      ],
    }).select("+senha +emailHash +crnHash");

    const isPasswordValid = await bcrypt.compare(
      safeUser.data.senha,
      user?.senha ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !isPasswordValid) {
      const loginFailure = await registerLoginFailure(req, _res);
      next(credenciaisInvalidasError(getLoginRemainingMessage(loginFailure)));
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

  const idNutricionista = req.nutricionistaId;
  const sessionId = req.sessionId;

  if (!idNutricionista || !sessionId) {
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
    await revogarSessaoAtual(sessionId, idNutricionista);

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
  const result = await register(req, next);

  if (result) {
    return res.status(result.statusCode).json(result);
  }
});

authRouter.post(
  "/register/resend",
  registerResendRateLimiter,
  async (req, res, next) => {
    const result = await resendRegistration(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

authRouter.post(
  "/register/confirm",
  registerConfirmRateLimiter,
  async (req, res, next) => {
    const result = await confirmRegistration(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

authRouter.post("/login", loginRateLimiter, async (req, res, next) => {
  const returnAuth = await login(req, res, next);

  if (returnAuth) {
    setSessionHeaders(res, returnAuth.tokens);
    return res.status(returnAuth.body.statusCode).json(returnAuth.body);
  }
});

authRouter.post("/refresh", refresh);
authRouter.post("/logout", authMiddleware, logout);
authRouter.post("/logout-all", authMiddleware, logoutAll);

export { authRouter };
