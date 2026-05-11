import { IUsuarioSchema } from "./usuarioInterfaces.js";
import { z } from "zod";


const INutricionistaSchema = IUsuarioSchema.extend({
    crn: z.string()
});

type INutricionista = z.infer<typeof INutricionistaSchema>

export {
    INutricionistaSchema, INutricionista
}
