// Destinado ao cadastro de paciente

import mongoose, { Schema } from "mongoose";
import { IPacienteDB, IPacienteMethods, PacienteModel } from "../interfaces/usuarios/pacienteInterfaces";
import crypto from "crypto";

// Chave AES-256: deve ser 32 bytes (64 caracteres hexadecimais) definida no .env
const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
const IV_LENGTH = 16;

function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
}

const pacienteSchema = new Schema<IPacienteDB, PacienteModel, IPacienteMethods>(
    {
        nome: { type: String, required: true, trim: true, minLength: 2 },
        sobrenome: { type: String, required: true, trim: true, minLength: 2 },
        email: { type: String, required: true },
        dataNascimento: { type: String, required: true },
        sexo: { type: String, enum: ["Masculino", "Feminino", "Outro"], required: true, trim: true, minLength: 2 },
    }
);

// Criptografa antes de salvar (mesmo padrão do bcrypt no nutricionista)
pacienteSchema.pre("save", function () {
    if (this.isModified("email")) {
        this.email = encrypt(this.email);
    }

    if (this.isModified("dataNascimento")) {
        this.dataNascimento = encrypt(String(this.dataNascimento));
    }
});

// Métodos para descriptografar ao ler os dados
pacienteSchema.methods.getEmailDescriptografado = function (): string {
    return decrypt(this.email);
};

pacienteSchema.methods.getDataNascimentoDescriptografada = function (): Date {
    return new Date(decrypt(this.dataNascimento));
};

const Paciente = mongoose.model<IPacienteDB, PacienteModel>("Paciente", pacienteSchema);

export default Paciente;