import z from "zod";
import { IRefeicoesSchema } from "./refeicoesInterfaces";
import { IRetornoApiSchema } from "../generalInterfaces";

export const IPlanoAlimentarSchema = z.object({
    objetivoDoPlano: z.string().optional(),
    observacoesGerais: z.string().optional(),
    refeicoes: z.array(IRefeicoesSchema).min(1, "O plano alimentar deve ter pelo menos 1 refeicao")
});

export type IPlanoAlimentar = z.infer<typeof IPlanoAlimentarSchema>;

export const IPlanoAlimentarRetornoSchema = IPlanoAlimentarSchema.extend({
    id: z.string().min(1),
});

export const IPlanoAlimentarPacienteParamsSchema = z
    .object({
        idPaciente: z
            .string()
            .trim()
            .regex(/^[a-fA-F0-9]{24}$/, "Id do paciente invalido"),
    })
    .strict();

export const IPlanoAlimentarParamsSchema =
    IPlanoAlimentarPacienteParamsSchema.extend({
        idPlano: z
            .string()
            .trim()
            .regex(/^[a-fA-F0-9]{24}$/, "Id do plano alimentar invalido"),
    });

export const ICadastrarPlanoAlimentarRequestSchema = z
    .object({
        planoAlimentar: IPlanoAlimentarSchema,
    })
    .strict();

export const IAtualizarPlanoAlimentarInputSchema = IPlanoAlimentarSchema
    .partial()
    .strict()
    .refine((planoAlimentar) => Object.keys(planoAlimentar).length > 0, {
        message: "Informe ao menos um campo para atualizar",
    });

export const IAtualizarPlanoAlimentarRequestSchema = z
    .object({
        planoAlimentar: IAtualizarPlanoAlimentarInputSchema,
    })
    .strict();

export const IRetornoPlanoAlimentarSchema = IRetornoApiSchema.extend({
    planoAlimentar: IPlanoAlimentarRetornoSchema,
});

export const IRetornoPlanosAlimentaresSchema = IRetornoApiSchema.extend({
    planosAlimentares: z.array(IPlanoAlimentarRetornoSchema),
});
