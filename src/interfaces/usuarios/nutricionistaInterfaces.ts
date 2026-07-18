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

const IAlimentoFavoritoSchema = z
  .object({
    idAlimento: z.string().trim().min(1, "Id do alimento e obrigatorio"),
    nomeAlimento: z
      .string()
      .trim()
      .min(1, "Nome do alimento favorito e obrigatorio"),
  })
  .strict();

const INutricionistaSchema = IUsuarioSchema.extend({
  crn: z
    .string()
    .trim()
    .min(5, "O CRN deve ter no mínimo 5 caracteres")
    .max(15, "O CRN deve ter no máximo 15 caracteres"),
  senha: z
    .string()
    .min(8, { message: "Senha deve ter pelo menos 8 caracteres" })
    .max(20, { message: "Senha deve ter no máximo 20 caracteres" }),
  imagemPerfil: imagem.optional(),
  imagemCapa: imagem.optional(),
  alimentosFavoritos: z.array(IAlimentoFavoritoSchema).default([]),
});

type INutricionista = z.infer<typeof INutricionistaSchema>;

const INutricionistaDBSchema = INutricionistaSchema.omit({
  nome: true,
  sobrenome: true,
  email: true,
  dataNascimento: true,
  crn: true,
  imagemPerfil: true,
  imagemCapa: true,
}).extend({
  nome: z.string(),
  sobrenome: z.string(),
  email: z.string(),
  dataNascimento: z.string(),
  crn: z.string(),
  imagemPerfil: z.string().optional(),
  imagemCapa: z.string().optional(),
  emailHash: z.string(),
  crnHash: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

type INutricionistaDB = z.infer<typeof INutricionistaDBSchema>;

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
  senha: true,
})
  .partial()
  .strict();

type IAtualizarNutricionistaRequest = z.infer<typeof IAtualizarNutricionista>;

const IRetornoPerfilNutricionistaSchema = IRetornoApiSchema.extend({
  nutricionista: IPerfilNutricionistaSchema,
});

interface INutricionistaMethods {
  validarSenha(senhaInformada: string): Promise<boolean>;
  getNomeDescriptografado(): string;
  getSobrenomeDescriptografado(): string;
  getEmailDescriptografado(): string;
  getDataNascimentoDescriptografada(): Date | undefined;
  getCrnDescriptografado(): string;
  getImagemPerfilDescriptografada(): string | undefined;
  getImagemCapaDescriptografada(): string | undefined;
}

type NutricionistaModel = Model<INutricionistaDB, {}, INutricionistaMethods>;

export {
  IAlimentoFavoritoSchema,
  INutricionistaSchema,
  INutricionista,
  INutricionistaDBSchema,
  INutricionistaDB,
  IPerfilNutricionistaSchema,
  IPerfilNutricionista,
  IAtualizarNutricionista,
  IAtualizarNutricionistaRequest,
  IRetornoPerfilNutricionistaSchema,
  INutricionistaMethods,
  NutricionistaModel,
};
