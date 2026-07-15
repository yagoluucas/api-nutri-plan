import { z } from "zod";
import { IUsuarioSchema } from "./usuarioInterfaces";
import {
  IPlanoAlimentarPersistidoSchema,
  IPlanoAlimentarRetornoSchema,
  IPlanoAlimentarSchema,
} from "../planoAlimentar/planoAlimentarInterfaces";
import { Model } from "mongoose";
import { IRetornoApiSchema } from "../generalInterfaces";

const optionalEmailPacienteSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Email invalido, valide e tente novamente" })
    .min(5)
    .max(100)
    .optional(),
);

const optionalDataNascimentoPacienteSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce
    .date()
    .max(new Date(), "A data de nascimento nao pode estar no futuro")
    .optional(),
);

const optionalObservacoesPacienteSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(1000, "Observacoes muito longas").optional(),
);

const IEvolucaoPacienteSchema = z.object({
  data: z.date(),
  peso: z.number(),
  altura: z.number(),
  imc: z.number(),
  percentualDeGordura: z.number().optional(),
  observacoes: z.string().optional(),
});

export const IPacienteSchema = IUsuarioSchema.pick({
  nome: true,
  sobrenome: true,
}).extend({
  idNutricionista: z
    .string()
    .trim()
    .min(1, "Id do nutricionista e obrigatorio"),
  email: optionalEmailPacienteSchema,
  dataNascimento: optionalDataNascimentoPacienteSchema,
  sexo: z.enum(["Masculino", "Feminino", "Outro"]),
  observacoes: optionalObservacoesPacienteSchema,
  planosAlimentares: z.array(IPlanoAlimentarSchema).optional(),
  evolucao: z.array(IEvolucaoPacienteSchema).optional(),
});

export type IPaciente = z.infer<typeof IPacienteSchema>;

// O contrato da API continua usando dados em texto claro. Esta estrutura representa
// somente o formato interno armazenado pelo Mongoose, onde os campos sensiveis ficam
// cifrados e os planos sao persistidos como payloads AES-GCM.
export const IPacienteDBSchema = IPacienteSchema.omit({
  nome: true,
  sobrenome: true,
  email: true,
  dataNascimento: true,
  sexo: true,
  observacoes: true,
  planosAlimentares: true,
  evolucao: true,
}).extend({
  nome: z.string(),
  sobrenome: z.string(),
  email: z.string().optional(),
  dataNascimento: z.string().optional(),
  sexo: z.string(),
  observacoes: z.string().optional(),
  planosAlimentares: z.array(IPlanoAlimentarPersistidoSchema).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type IPacienteDB = z.infer<typeof IPacienteDBSchema>;

export interface IPacienteMethods {
  getNomeDescriptografado(): string;
  getSobrenomeDescriptografado(): string;
  getEmailDescriptografado(): string | undefined;
  getDataNascimentoDescriptografada(): Date | undefined;
  getSexoDescriptografado(): "Masculino" | "Feminino" | "Outro";
  getObservacoesDescriptografadas(): string | undefined;
}

export const ICadastrarPacienteInputSchema = IPacienteSchema.omit({
  idNutricionista: true,
});

export const ICadastrarPacienteRequestSchema = z
  .object({
    paciente: ICadastrarPacienteInputSchema,
  })
  .strict();

export const IAtualizarPacienteInputSchema = IPacienteSchema.pick({
  nome: true,
  sobrenome: true,
  email: true,
  dataNascimento: true,
  sexo: true,
  observacoes: true,
})
  .partial()
  .strict()
  .refine((paciente) => Object.keys(paciente).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const IAtualizarPacienteRequestSchema = z
  .object({
    paciente: IAtualizarPacienteInputSchema,
  })
  .strict();

export const IBuscarUsuarioParamsSchema = z
  .object({
    idPaciente: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{24}$/, "Id do paciente invalido"),
  })
  .strict();

export const IPacienteRetornoSchema = IPacienteSchema.omit({
  dataNascimento: true,
}).extend({
  id: z.string(),
  dataNascimento: z.string().optional(),
  planosAlimentares: z.array(IPlanoAlimentarRetornoSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const IPacienteListaItemSchema = IPacienteSchema.pick({
  nome: true,
  sobrenome: true,
  email: true,
})
  .extend({
    id: z.string(),
    dataNascimento: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    qtdPlanos: z.number(),
  })
  .strict();

export const IRetornoPacienteSchema = IRetornoApiSchema.extend({
  paciente: IPacienteRetornoSchema,
});

export const IRetornoPacientesSchema = IRetornoApiSchema.extend({
  pacientes: z.array(IPacienteListaItemSchema),
});

export type PacienteModel = Model<IPacienteDB, {}, IPacienteMethods>;
