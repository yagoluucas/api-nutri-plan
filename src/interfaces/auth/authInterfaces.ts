import {z} from "zod";
import {IRetornoApiSchema} from "../generalInterfaces.js"

const IBasicUserSchema = z.object({
    id: z.string(),
    nome: z.string(),
    email: z.string()
});

type IBasicUser = z.infer<typeof IBasicUserSchema>

const IAuthSchema = IRetornoApiSchema.extend({
    token: z.string().optional(),
    user: IBasicUserSchema.optional()
});

type IAuth = z.infer<typeof IAuthSchema>

export { 
    IAuthSchema, IAuth,
    IBasicUserSchema, IBasicUser
}
