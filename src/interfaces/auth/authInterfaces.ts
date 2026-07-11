import { z } from "zod";
import { IRetornoApiSchema } from "../generalInterfaces.js";

const ILoginUserSchema = z.object({
  email: z.email(),
  senha: z.string(),
});

type ILoginUser = z.infer<typeof ILoginUserSchema>;

const IAccessTokenPayloadSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  type: z.literal("access"),
});

type IAccessTokenPayload = z.infer<typeof IAccessTokenPayloadSchema>;

const IRefreshTokenPayloadSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  type: z.literal("refresh"),
});

type IRefreshTokenPayload = z.infer<typeof IRefreshTokenPayloadSchema>;

const ITokenPayloadSchema = IAccessTokenPayloadSchema;
type ITokenPayload = IAccessTokenPayload;

const IRefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string().trim().min(1),
  })
  .strict();

type IRefreshTokenRequest = z.infer<typeof IRefreshTokenRequestSchema>;

const ILogoutRequestSchema = z
  .object({
    refreshToken: z.string().trim().min(1).optional(),
  })
  .strict();

type ILogoutRequest = z.infer<typeof ILogoutRequestSchema>;

const AuthUserResponseSchema = z
  .object({
    id: z.string().min(1),
    nome: z.string().min(1),
    email: z.email(),
  })
  .strict();

type AuthUserResponse = z.infer<typeof AuthUserResponseSchema>;

const AuthSuccessBodySchema = IRetornoApiSchema.extend({
  error: z.literal(false),
  user: AuthUserResponseSchema,
}).strict();

type AuthSuccessBody = z.infer<typeof AuthSuccessBodySchema>;

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

const IBasicUserSchema = AuthUserResponseSchema;
type IBasicUser = AuthUserResponse;

const IAuthSchema = AuthSuccessBodySchema;
type IAuth = AuthSuccessBody;

export {
  AuthUserResponseSchema,
  AuthUserResponse,
  AuthSuccessBodySchema,
  AuthSuccessBody,
  AuthTokensSchema,
  AuthTokens,
  AuthResultSchema,
  AuthResult,
  IAuthSchema,
  IAuth,
  IBasicUserSchema,
  IBasicUser,
  ILoginUserSchema,
  ILoginUser,
  IAccessTokenPayloadSchema,
  IAccessTokenPayload,
  IRefreshTokenPayloadSchema,
  IRefreshTokenPayload,
  IRefreshTokenRequestSchema,
  IRefreshTokenRequest,
  ILogoutRequestSchema,
  ILogoutRequest,
  ITokenPayloadSchema,
  ITokenPayload,
};
