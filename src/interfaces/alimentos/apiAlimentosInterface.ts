import { z } from "zod";
import { IAlimentoSchema } from "./modelAlimentosInterface.js";
import { IRetornoApiSchema } from "../generalInterfaces.js";

const IRecuperarAlimentosSchema = IRetornoApiSchema.extend({
    qtdAlimentosEncontrados: z.number().optional(),
    alimentos: z.array(IAlimentoSchema).optional()
});

type IRecuperarAlimentos = z.infer<typeof IRecuperarAlimentosSchema>;

const ICadastrarAlimentosSchema = IRetornoApiSchema.extend({});

type ICadastrarAlimentos = z.infer<typeof ICadastrarAlimentosSchema>;

export { 
    IRecuperarAlimentosSchema, IRecuperarAlimentos, 
    ICadastrarAlimentosSchema, ICadastrarAlimentos 
};