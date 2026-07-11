import { IUsuarioSchema } from "./usuarioInterfaces.js";
import { z } from "zod";
import { Model } from "mongoose";
import { IRetornoApiSchema } from "../generalInterfaces.js";

const imagem = z
    .string()
    .trim()
    .max(2_800_000, "Imagem muito grande")
    .regex(
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
        "Imagem invalida. Envie uma imagem png, jpeg ou webp em base64",
    );

const INutricionistaSchema = IUsuarioSchema.extend({
    crn: z.string().trim().min(5, "O CRN deve ter no mínimo 5 caracteres").max(15, "O CRN deve ter no máximo 15 caracteres"),
    senha: z.string().min(8, { message: "Senha deve ter pelo menos 8 caracteres" }).max(20, { message: "Senha deve ter no máximo 20 caracteres" })
    ,
    imagemPerfil: imagem.optional(),
    imagemCapa: imagem.optional()
});

type INutricionista = z.infer<typeof INutricionistaSchema>;

const IPerfilNutricionistaSchema = INutricionistaSchema.omit({
    senha: true,
}).extend({
    id: z.string().min(1),
    dataNascimento: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

type IPerfilNutricionista = z.infer<typeof IPerfilNutricionistaSchema>;

const IAtualizarNutricionista = INutricionistaSchema.omit({
    senha: true
}).partial().strict();

type IAtualizarNutricionistaRequest = z.infer<
    typeof IAtualizarNutricionista
>;

const IRetornoPerfilNutricionistaSchema = IRetornoApiSchema.extend({
    nutricionista: IPerfilNutricionistaSchema,
});

interface INutricionistaMethods {
    validarSenha(senhaInformada: string): Promise<boolean>;
}

type NutricionistaModel = Model<INutricionista, {}, INutricionistaMethods>;

export {
    INutricionistaSchema, INutricionista,
    IPerfilNutricionistaSchema, IPerfilNutricionista,
    IAtualizarNutricionista,
    IAtualizarNutricionistaRequest,
    IRetornoPerfilNutricionistaSchema,
    INutricionistaMethods, NutricionistaModel
}
