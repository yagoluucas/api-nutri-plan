import mongoose, { Schema } from "mongoose";
import { INutricionista, INutricionistaMethods, NutricionistaModel } from "../interfaces/usuarios/nutricionistaInterfaces.js"
import bcrypt from "bcrypt"

const nutricionistaSchema = new Schema<INutricionista, NutricionistaModel, INutricionistaMethods>(
    {
        crn: { type: String, required: true, trim: true, minLength: 8 },
        nome: { type: String, required: true, trim: true, minLength: 2 },
        sobrenome: { type: String, required: true, trim: true, minlength: 2 },
        email: { type: String, required: true, trim: true, lowercase: true, minlength: 2 },
        dataNascimento: { type: Date, required: true },
        senha: { type: String, required: true, minLength: 8, select: false }
    },
    {
        timestamps: true,
    }
)

// Criação dos índices para otimizar buscas por email e CRN
nutricionistaSchema.index({ email: 1, unique: 1 })
nutricionistaSchema.index({ crn: 1, unique: 1 })

// Criação das informações para salvar e checar a asenha

nutricionistaSchema.pre("save", async function () {
    if (!this.isModified("senhaHash")) return;

    const saltRounds = 10;
    this.senha = await bcrypt.hash(this.senha, saltRounds);
})

nutricionistaSchema.methods.validarSenha = async function (senhaInformada: string): Promise<boolean> {
    return bcrypt.compare(senhaInformada, this.senha);
}

const Nutricionista = mongoose.model("Nutricionista", nutricionistaSchema);

export default Nutricionista;