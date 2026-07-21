import z from "zod";
import { Model } from "mongoose";
import { IRetornoApiSchema } from "../generalInterfaces";

export const IMedidaSelecionadaPlanoAlimentarSchema = z.object({
    nomeMedida: z.string().trim().min(1, "O nome da medida e obrigatorio"),
    total: z.number().positive("O total da medida selecionada deve ser maior que zero"),
    unidadeMedida: z.string().trim().min(1, "A unidade da medida e obrigatoria"),
    tipoMedida: z.enum(["Caseira", "Tecnica"]),
});

export type IMedidaSelecionadaPlanoAlimentar = z.infer<
    typeof IMedidaSelecionadaPlanoAlimentarSchema
>;

export const IAlimentoPlanoAlimentarSchema = z.object({
    codigoAlimento: z.string({ error: "O codigo do alimento e obrigatorio" }),
    quantidade: z.number().positive("A quantidade deve ser maior que zero"),
    medidaSelecionada: IMedidaSelecionadaPlanoAlimentarSchema,
});

export type IAlimentoPlanoAlimentar = z.infer<
    typeof IAlimentoPlanoAlimentarSchema
>;

export const IRefeicaoPlanoAlimentarSchema = z.object({
    nome: z.string().trim().min(1, "O nome da refeicao e obrigatorio").max(30),
    horario: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Horario invalido. Use o formato HH:mm entre 00:00 e 23:59"),
    observacoes: z.string().optional(),
    alimentos: z.array(IAlimentoPlanoAlimentarSchema).min(1, "A refeicao deve ter pelo menos 1 alimento"),
});

export type IRefeicaoPlanoAlimentar = z.infer<
    typeof IRefeicaoPlanoAlimentarSchema
>;

export const IPlanoAlimentarSchema = z.object({
    tituloPlano: z.string().optional(),
    objetivoDoPlano: z.string().optional(),
    observacoesGerais: z.string().optional(),
    refeicoes: z.array(IRefeicaoPlanoAlimentarSchema).min(1, "O plano alimentar deve ter pelo menos 1 refeicao")
});

export type IPlanoAlimentar = z.infer<typeof IPlanoAlimentarSchema>;

export const IPlanoAlimentarInputSchema = IPlanoAlimentarSchema.extend({
    planoAtivo: z.boolean().optional(),
});

export type IPlanoAlimentarInput = z.infer<typeof IPlanoAlimentarInputSchema>;

// Estrutura interna persistida no MongoDB. O conteudo do plano fica criptografado,
// enquanto campos operacionais ficam abertos para filtros e atualizacoes simples.
export const IPlanoAlimentarPersistidoSchema = z.object({
    idPaciente: z
        .string()
        .trim()
        .regex(/^[a-fA-F0-9]{24}$/, "Id do paciente invalido"),
    planoAtivo: z.boolean().optional(),
    conteudoProtegido: z.string(),
});

export type IPlanoAlimentarPersistido = z.infer<typeof IPlanoAlimentarPersistidoSchema>;

export const IPlanoAlimentarDBSchema = IPlanoAlimentarPersistidoSchema.extend({
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type IPlanoAlimentarDB = z.infer<typeof IPlanoAlimentarDBSchema>;

export type PlanoAlimentarModel = Model<IPlanoAlimentarDB>;

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
