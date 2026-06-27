import { IUsuarioSchema } from "./usuarioInterfaces.js";
import { z } from "zod";
import { Model } from "mongoose";

const INutricionistaSchema = IUsuarioSchema.extend({
    crn: z.string().trim().min(8, "O CRN deve ter no mínimo 8 caracteres").max(15, "O CRN deve ter no máximo 15 caracteres")
});

type INutricionista = z.infer<typeof INutricionistaSchema>;

interface INutricionistaMethods {
    validarSenha(senhaInformada: string): Promise<boolean>;
}

type NutricionistaModel = Model<INutricionista, {}, INutricionistaMethods>;

export {
    INutricionistaSchema, INutricionista,
    INutricionistaMethods, NutricionistaModel
}
