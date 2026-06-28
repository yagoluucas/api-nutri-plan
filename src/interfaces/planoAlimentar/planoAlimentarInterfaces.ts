import z from "zod";
import { IRefeicoesSchema } from "./refeicoesInterfaces";

export const IPlanoAlimentarSchema = z.object({
    objetivoDoPlano: z.string().optional(),
    observacoesGerais: z.string().optional(),
    refeicoes: z.array(IRefeicoesSchema)
});

export type IPlanoAlimentar = z.infer<typeof IPlanoAlimentarSchema>;