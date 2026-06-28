import { z } from "zod";
import { IUsuarioSchema } from "./usuarioInterfaces";
import { IPlanoAlimentarSchema } from "../planoAlimentar/planoAlimentarInterfaces";
import { Model } from "mongoose";

const IEvolucaoPacienteSchema = z.object({
    data: z.date(),
    peso: z.number(),
    altura: z.number(),
    imc: z.number(),
    percentualDeGordura: z.number().optional(),
    observacoes: z.string().optional(),
})

export const IPacienteSchema = IUsuarioSchema.extend({
    sexo: z.enum(["Masculino", "Feminino", "Outro"]),
    planosAlimentares: z.array(IPlanoAlimentarSchema).optional(),
    evolucao: z.array(IEvolucaoPacienteSchema).optional(),
})

export type IPaciente = z.infer<typeof IPacienteSchema>;

// Interface para o documento no banco — dataNascimento é string pois é armazenado criptografado
export interface IPacienteDB extends Omit<IPaciente, 'dataNascimento'> {
    dataNascimento: string;
}

export interface IPacienteMethods {
    getEmailDescriptografado(): string;
    getDataNascimentoDescriptografada(): Date;
}

export type PacienteModel = Model<IPacienteDB, {}, IPacienteMethods>;