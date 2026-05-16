import { z } from "zod";

const IUsuarioSchema = z.object({
    nome: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(50, { message: "Nome deve ter no máximo 50 caracteres" }),
    sobrenome: z.string().trim().min(2, { message: "Sobrenome deve ter pelo menos 2 caracteres" }).max(50, { message: "Sobrenome deve ter no máximo 50 caracteres" }),
    email: z.email({
        message: "Email inválido, valide e tente novamente"
    }).trim().toLowerCase().min(5).max(100),
    dataNascimento: z.coerce.date(),
    senha: z.string().min(8, { message: "Senha deve ter pelo menos 8 caracteres" }).max(20, { message: "Senha deve ter no máximo 20 caracteres" })
});

type IUsuario = z.infer<typeof IUsuarioSchema>;

export { IUsuarioSchema, IUsuario }
