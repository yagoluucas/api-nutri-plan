import mongoose, { Schema } from "mongoose";
import { INutricionista, INutricionistaMethods, NutricionistaModel } from "../interfaces/usuarios/nutricionistaInterfaces.js"
import bcrypt from "bcrypt"

const nutricionistaSchema = new Schema<INutricionista, NutricionistaModel, INutricionistaMethods>(
    {
        crn: { type: String, required: true, trim: true, minLength: 8 },
        nome: { type: String, required: true, trim: true, minLength: 2 },
        sobrenome: { type: String, required: true, trim: true, minlength: 2 },
        email: { type: String, required: true, trim: true, lowercase: true, match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Email incorreto, valide e tente novamente."] },
        dataNascimento: { type: Date, required: true },
        imagemPerfil: { type: String, maxLength: 2_800_000 },
        senha: { type: String, required: true, minLength: 8, select: false, match: [/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, "A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial." ]}
    },
    {
        timestamps: true,
    }
)

// Criação dos índices para otimizar buscas por email e CRN
nutricionistaSchema.index({ email: 1, unique: 1 })
nutricionistaSchema.index({ crn: 1, unique: 1 })

// Criação das informações para salvar e checar a senha

nutricionistaSchema.pre("save", async function () {
    if (!this.isModified("senha")) return;

    const saltRounds = 10;
    this.senha = await bcrypt.hash(this.senha, saltRounds);
});

nutricionistaSchema.methods.validarSenha = async function (senhaInformada: string): Promise<boolean> {
    return bcrypt.compare(senhaInformada, this.senha);
}

const Nutricionista = mongoose.model("Nutricionista", nutricionistaSchema);

export default Nutricionista;
