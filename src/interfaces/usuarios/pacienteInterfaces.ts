import { z } from "zod";
import { IUsuarioSchema } from "./usuarioInterfaces";
import { Model } from "mongoose";
import { IRetornoApiSchema } from "../generalInterfaces";

const optionalEmailPacienteSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .email({ message: "Email invalido, valide e tente novamente" })
    .trim()
    .toLowerCase()
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

function getInicioDoDiaAtual() {
  const hoje = new Date();
  return getDateOnlyUtc(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  );
}

function getDateOnlyUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function normalizarDataApenasDia(value: unknown) {
  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return undefined;
    }

    const dateOnlyMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dateOnlyMatch) {
      return getDateOnlyUtc(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      );
    }
  }

  const parsedDate = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return getDateOnlyUtc(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
  );
}

const optionalDataEntregaPrimeiroPlanoSchema = z.preprocess(
  normalizarDataApenasDia,
  z
    .date()
    .refine(
      (date) => date.getTime() >= getInicioDoDiaAtual().getTime(),
      "A data de entrega do primeiro plano nao pode estar no passado",
    )
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

const IQtdPlanosPacienteSchema = z.number().int().min(0).optional();

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
  dataEntregaPrimeiroPlano: optionalDataEntregaPrimeiroPlanoSchema,
  sexo: z.enum(["Masculino", "Feminino", "Outro"]),
  observacoes: optionalObservacoesPacienteSchema,
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
  evolucao: true,
}).extend({
  nome: z.string(),
  sobrenome: z.string(),
  email: z.string().optional(),
  dataNascimento: z.string().optional(),
  dataEntregaPrimeiroPlano: z.date().optional(),
  sexo: z.string(),
  observacoes: z.string().optional(),
  qtdPlanos: IQtdPlanosPacienteSchema,
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
  dataEntregaPrimeiroPlano: true,
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
  dataEntregaPrimeiroPlano: true,
}).extend({
  id: z.string(),
  dataNascimento: z.string().optional(),
  dataEntregaPrimeiroPlano: z.string().optional(),
  qtdPlanos: IQtdPlanosPacienteSchema,
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
    dataEntregaPrimeiroPlano: z.string().optional(),
    qtdPlanos: IQtdPlanosPacienteSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const IRetornoPacienteSchema = IRetornoApiSchema.extend({
  paciente: IPacienteRetornoSchema,
});

export const IRetornoPacientesSchema = IRetornoApiSchema.extend({
  pacientes: z.array(IPacienteListaItemSchema),
});

export type PacienteModel = Model<IPacienteDB, {}, IPacienteMethods>;
