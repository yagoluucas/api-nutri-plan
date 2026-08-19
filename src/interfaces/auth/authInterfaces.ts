import { z } from "zod";
import { IRetornoApiSchema } from "../generalInterfaces.js";

const ILoginUserSchema = z.object({
  email: z.email(),
  senha: z.string(),
});

const IAccessTokenPayloadSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  type: z.literal("access"),
});

const IRefreshTokenPayloadSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  type: z.literal("refresh"),
});

const IRefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string().trim().min(1),
  })
  .strict();

const ILogoutRequestSchema = z
  .object({
    refreshToken: z.string().trim().min(1).optional(),
  })
  .strict();

const AuthUserResponseSchema = z
  .object({
    id: z.string().min(1),
    nome: z.string().min(1),
    email: z.email(),
  })
  .strict();

const AuthSuccessBodySchema = IRetornoApiSchema.extend({
  error: z.literal(false),
  user: AuthUserResponseSchema,
}).strict();

const AuthTokensSchema = z
  .object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    accessTokenExpiresInSeconds: z.number().int().positive(),
    refreshTokenExpiresInSeconds: z.number().int().positive(),
    refreshTokenExpiresAt: z.date(),
  })
  .strict();

type AuthTokens = z.infer<typeof AuthTokensSchema>;

const AuthResultSchema = z
  .object({
    tokens: AuthTokensSchema,
    body: AuthSuccessBodySchema,
  })
  .strict();

type AuthResult = z.infer<typeof AuthResultSchema>;

export {
  AuthUserResponseSchema,
  AuthSuccessBodySchema,
  AuthTokensSchema,
  AuthTokens,
  AuthResultSchema,
  AuthResult,
  ILoginUserSchema,
  IAccessTokenPayloadSchema,
  IRefreshTokenPayloadSchema,
  IRefreshTokenRequestSchema,
  ILogoutRequestSchema,
};
