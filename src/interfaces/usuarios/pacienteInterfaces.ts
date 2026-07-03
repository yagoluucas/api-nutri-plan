import { z } from "zod";
import { IUsuarioSchema } from "./usuarioInterfaces";
import { IPlanoAlimentarSchema } from "../planoAlimentar/planoAlimentarInterfaces";
import { Model } from "mongoose";
import { IRetornoApiSchema } from "../generalInterfaces";

const optionalEmailPacienteSchema = z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string()
        .trim()
        .toLowerCase()
        .email({ message: "Email invalido, valide e tente novamente" })
        .min(5)
        .max(100)
        .optional(),
)

const optionalDataNascimentoPacienteSchema = z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.date()
        .max(new Date(), "A data de nascimento nao pode estar no futuro")
        .optional(),
)

const optionalObservacoesPacienteSchema = z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(1000, "Observacoes muito longas").optional(),
)

const IEvolucaoPacienteSchema = z.object({
    data: z.date(),
    peso: z.number(),
    altura: z.number(),
    imc: z.number(),
    percentualDeGordura: z.number().optional(),
    observacoes: z.string().optional(),
})

export const IPacienteSchema = IUsuarioSchema.pick({
    nome: true,
    sobrenome: true,
}).extend({
    idNutricionista: z.string().trim().min(1, "Id do nutricionista e obrigatorio"),
    email: optionalEmailPacienteSchema,
    dataNascimento: optionalDataNascimentoPacienteSchema,
    sexo: z.enum(["Masculino", "Feminino", "Outro"]),
    observacoes: optionalObservacoesPacienteSchema,
    planosAlimentares: z.array(IPlanoAlimentarSchema).optional(),
    evolucao: z.array(IEvolucaoPacienteSchema).optional(),
})

export type IPaciente = z.infer<typeof IPacienteSchema>;

export const IPacienteDBSchema = IPacienteSchema.omit({ email: true, dataNascimento: true }).extend({
    email: z.string().optional(),
    dataNascimento: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
})

export type IPacienteDB = z.infer<typeof IPacienteDBSchema>;

export interface IPacienteMethods {
    getEmailDescriptografado(): string | undefined;
    getDataNascimentoDescriptografada(): Date | undefined;
}

export const ICadastrarPacienteInputSchema = IPacienteSchema.omit({ idNutricionista: true });

export const ICadastrarPacienteRequestSchema = z.object({
    paciente: ICadastrarPacienteInputSchema,
}).strict()

export const IPacienteRetornoSchema = IPacienteSchema.omit({ dataNascimento: true }).extend({
    id: z.string(),
    dataNascimento: z.string().optional(),
    planosAlimentares: z.array(IPlanoAlimentarSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
})

export const ICadastrarPacienteSchema = IRetornoApiSchema.extend({
    paciente: IPacienteRetornoSchema,
})

export type PacienteModel = Model<IPacienteDB, {}, IPacienteMethods>;
