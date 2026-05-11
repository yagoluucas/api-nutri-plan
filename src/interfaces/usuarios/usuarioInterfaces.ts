import { z } from "zod";

const IUsuarioSchema = z.object({
    nome: z.string(),
    sobrenome: z.string(),
    email: z.email(),
    dataNascimento: z.coerce.date(),
    senhaHash: z.string()
});

type IUsuario = z.infer<typeof IUsuarioSchema>;

export { IUsuarioSchema, IUsuario }
