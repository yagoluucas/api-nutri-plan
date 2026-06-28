import {z} from "zod";
import {IRetornoApiSchema} from "../generalInterfaces.js"

const ILoginUserSchema = z.object({
    email: z.email(),
    senha: z.string()
})

type ILoginUser = z.infer<typeof ILoginUserSchema>

const ITokenPayloadSchema = z.object({
    id: z.string().min(1)
})

type ITokenPayload = z.infer<typeof ITokenPayloadSchema>

const AuthUserResponseSchema = z.object({
    id: z.string().min(1),
    nome: z.string().min(1),
    email: z.email()
}).strict();

type AuthUserResponse = z.infer<typeof AuthUserResponseSchema>

const AuthSuccessBodySchema = IRetornoApiSchema.extend({
    error: z.literal(false),
    user: AuthUserResponseSchema
}).strict();

type AuthSuccessBody = z.infer<typeof AuthSuccessBodySchema>

const AuthResultSchema = z.object({
    token: z.string().min(1),
    body: AuthSuccessBodySchema
}).strict();

type AuthResult = z.infer<typeof AuthResultSchema>

const IBasicUserSchema = AuthUserResponseSchema;
type IBasicUser = AuthUserResponse

const IAuthSchema = AuthSuccessBodySchema;
type IAuth = AuthSuccessBody

export { 
    AuthUserResponseSchema, AuthUserResponse,
    AuthSuccessBodySchema, AuthSuccessBody,
    AuthResultSchema, AuthResult,
    IAuthSchema, IAuth,
    IBasicUserSchema, IBasicUser,
    ILoginUserSchema, ILoginUser,
    ITokenPayloadSchema, ITokenPayload
}
