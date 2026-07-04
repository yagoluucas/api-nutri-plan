import { z } from "zod";

export const IRefeicoesSchema = z.object({
    nome: z.string().trim().min(1, "O nome da refeicao e obrigatorio").max(30),
    horario: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Horario invalido. Use o formato HH:mm entre 00:00 e 23:59"),
    observacoes: z.string().optional(),
    alimentos: z.array(
        z.object({
            codigoAlimento: z.string({error: "O código do alimento é obrigatório"}),
            quantidade: z.number().positive("A quantidade deve ser maior que zero"),
            medidaSelecionada: z.object({
                nomeMedida: z.string().trim().min(1, "O nome da medida e obrigatorio"),
                total: z.number().positive("O total da medida selecionada deve ser maior que zero"),
                unidadeMedida: z.string().trim().min(1, "A unidade da medida e obrigatoria"),
                tipoMedida: z.enum(["Caseira", "Tecnica"])
            })
        })
    ).min(1, "A refeição deve ter pelo menos 1 alimento")
});

export type IRefeicao = z.infer<typeof IRefeicoesSchema>;
