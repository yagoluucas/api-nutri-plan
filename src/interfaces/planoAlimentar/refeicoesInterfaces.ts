import { z } from "zod";

export const IRefeicoesSchema = z.object({
    nome: z.string().min(1).max(30),
    horario: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    observacoes: z.string().optional(), // Deixei 'observacoes' no plural para bater com o front
    alimentos: z.array(
        z.object({
            codigoAlimento: z.string({error: "O código do alimento é obrigatório"}),
            quantidade: z.number().positive("A quantidade deve ser maior que zero"),
            medidaSelecionada: z.object({
                nomeMedida: z.string(),
                total: z.number(),
                unidadeMedida: z.string(),
                tipoMedida: z.enum(["Caseira", "Tecnica"])
            })
        })
    ).min(1, "A refeição deve ter pelo menos 1 alimento")
});

export type IRefeicao = z.infer<typeof IRefeicoesSchema>;