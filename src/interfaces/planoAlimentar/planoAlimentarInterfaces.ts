import z from "zod";
import { IRefeicoesSchema } from "./refeicoesInterfaces";
import { IRetornoApiSchema } from "../generalInterfaces";

export const IPlanoAlimentarSchema = z.object({
    tituloPlano: z.string().optional(),
    objetivoDoPlano: z.string().optional(),
    observacoesGerais: z.string().optional(),
    refeicoes: z.array(IRefeicoesSchema).min(1, "O plano alimentar deve ter pelo menos 1 refeicao")
});

export type IPlanoAlimentar = z.infer<typeof IPlanoAlimentarSchema>;

export const IPlanoAlimentarInputSchema = IPlanoAlimentarSchema.extend({
    planoAtivo: z.boolean().optional(),
});

export type IPlanoAlimentarInput = z.infer<typeof IPlanoAlimentarInputSchema>;

// Estrutura interna persistida no MongoDB. O conteudo do plano fica criptografado,
// enquanto campos operacionais ficam abertos para filtros e atualizacoes simples.
export const IPlanoAlimentarPersistidoSchema = z.object({
    planoAtivo: z.boolean().optional(),
    conteudoProtegido: z.string(),
});

export type IPlanoAlimentarPersistido = z.infer<typeof IPlanoAlimentarPersistidoSchema>;

export const IPlanoAlimentarRetornoSchema = IPlanoAlimentarSchema.extend({
    id: z.string().min(1),
    planoAtivo: z.boolean(),
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
        planoAlimentar: IPlanoAlimentarInputSchema,
    })
    .strict();

export const IAtualizarPlanoAlimentarInputSchema = IPlanoAlimentarInputSchema
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
