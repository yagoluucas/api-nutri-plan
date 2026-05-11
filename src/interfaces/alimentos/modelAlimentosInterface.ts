import { z } from "zod";

const tipoMedidaSchema = z.enum(["Caseira", "Tecnica"]);
type tipoMedida = z.infer<typeof tipoMedidaSchema>;

const INutrienteSchema = z.object({
    nomeComponente: z.string(),
    valorPor100G: z.number().nullable(),
    unidadeUtilizada: z.string()
});
type INutriente = z.infer<typeof INutrienteSchema>;

const IMedidasCaseirasSchema = z.object({
    nomeMedida: z.string(),
    total: z.number(),
    unidadeMedida: z.string(),
    tipoMedida: tipoMedidaSchema
});
type IMedidasCaseiras = z.infer<typeof IMedidasCaseirasSchema>;

const IAlimentoSchema = z.object({
    codigoAlimento: z.string(),
    nomeAlimento: z.string(),
    linkAlimento: z.string(),
    grupo: z.string().nullable(),
    marca: z.string().nullable(),
    nutrientes: z.array(INutrienteSchema),
    medidasCaseiras: z.array(IMedidasCaseirasSchema)
});
type IAlimento = z.infer<typeof IAlimentoSchema>;

export { 
    INutrienteSchema, INutriente, 
    IMedidasCaseirasSchema, IMedidasCaseiras, 
    IAlimentoSchema, IAlimento, 
    tipoMedidaSchema, tipoMedida 
};
