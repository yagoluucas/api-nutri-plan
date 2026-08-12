import { IUsuarioSchema } from "./usuarioInterfaces.js";
import { z } from "zod";
import { Model } from "mongoose";
import { IRetornoApiSchema } from "../generalInterfaces.js";

const IAlimentoFavoritoSchema = z
  .object({
    idAlimento: z.string().trim().min(1, "Id do alimento e obrigatorio"),
    nomeAlimento: z
      .string()
      .trim()
      .min(1, "Nome do alimento favorito e obrigatorio"),
  })
  .strict();

const IImagemNutricionistaSchema = z
  .string()
  .trim()
  .url("URL da imagem invalida")
  .max(2_800, "URL da imagem muito longa");

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
  alimentosFavoritos: z.array(IAlimentoFavoritoSchema).default([]),
  imagemPerfil: IImagemNutricionistaSchema.optional(),
  imagemCapa: IImagemNutricionistaSchema.optional(),
});

type INutricionista = z.infer<typeof INutricionistaSchema>;

const INutricionistaDBSchema = INutricionistaSchema.omit({
  nome: true,
  sobrenome: true,
  email: true,
  dataNascimento: true,
  crn: true,
}).extend({
  nome: z.string(),
  sobrenome: z.string(),
  email: z.string(),
  dataNascimento: z.string(),
  crn: z.string(),
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
  imagemPerfil: true,
  imagemCapa: true,
})
  .partial()
  .extend({
    alimentosFavoritos: z.array(IAlimentoFavoritoSchema).optional(),
  })
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
}

type NutricionistaModel = Model<INutricionistaDB, {}, INutricionistaMethods>;

export {
  IAlimentoFavoritoSchema,
  IImagemNutricionistaSchema,
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
