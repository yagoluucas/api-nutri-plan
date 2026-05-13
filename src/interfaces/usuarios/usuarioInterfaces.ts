import { z } from "zod";

const IUsuarioSchema = z.object({
    nome: z.string().trim().min(2),
    sobrenome: z.string().trim().min(2),
    email: z.email().trim().toLowerCase().min(5).max(60),
    dataNascimento: z.coerce.date(),
    senha: z.string().min(8).max(20)
});

type IUsuario = z.infer<typeof IUsuarioSchema>;

export { IUsuarioSchema, IUsuario }
