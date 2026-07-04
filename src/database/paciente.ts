// Destinado ao cadastro de paciente

import mongoose, { Schema } from "mongoose";
import { IPacienteDB, IPacienteMethods, PacienteModel } from "../interfaces/usuarios/pacienteInterfaces";
import crypto from "crypto";

// Chave AES-256: deve ser 32 bytes (64 caracteres hexadecimais) definida no .env
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getSecretKey(): Buffer {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
        throw new Error("ENCRYPTION_KEY nao configurada.");
    }

    const secretKey = Buffer.from(encryptionKey, "hex");

    if (secretKey.length !== 32) {
        throw new Error("ENCRYPTION_KEY deve ter 32 bytes em hexadecimal.");
    }

    return secretKey;
}

function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
}

function hasAtLeastOneItem(value: unknown[]) {
    return Array.isArray(value) && value.length > 0;
}

const medidaSelecionadaSchema = new Schema(
    {
        nomeMedida: { type: String, required: true },
        total: { type: Number, required: true, min: Number.MIN_VALUE },
        unidadeMedida: { type: String, required: true },
        tipoMedida: { type: String, enum: ["Caseira", "Tecnica"], required: true },
    },
    { _id: false },
);

const alimentoPlanoSchema = new Schema(
    {
        codigoAlimento: { type: String, required: true },
        quantidade: { type: Number, required: true, min: Number.MIN_VALUE },
        medidaSelecionada: { type: medidaSelecionadaSchema, required: true },
    },
    { _id: false },
);

const refeicaoPlanoSchema = new Schema(
    {
        nome: { type: String, required: true, trim: true, minLength: 1, maxLength: 30 },
        horario: { type: String, required: true, match: /^([01][0-9]|2[0-3]):[0-5][0-9]$/ },
        observacoes: { type: String },
        alimentos: {
            type: [alimentoPlanoSchema],
            required: true,
            validate: {
                validator: hasAtLeastOneItem,
                message: "A refeicao deve ter pelo menos 1 alimento",
            },
        },
    },
    { _id: false },
);

const planoAlimentarSchema = new Schema(
    {
        objetivoDoPlano: { type: String },
        observacoesGerais: { type: String },
        refeicoes: {
            type: [refeicaoPlanoSchema],
            required: true,
            validate: {
                validator: hasAtLeastOneItem,
                message: "O plano alimentar deve ter pelo menos 1 refeicao",
            },
        },
    },
    { _id: true },
);

const pacienteSchema = new Schema<IPacienteDB, PacienteModel, IPacienteMethods>(
    {
        idNutricionista: { type: String, required: true, trim: true, index: true },
        nome: { type: String, required: true, trim: true, minLength: 2 },
        sobrenome: { type: String, required: true, trim: true, minLength: 2 },
        email: { type: String },
        dataNascimento: { type: String },
        sexo: { type: String, enum: ["Masculino", "Feminino", "Outro"], required: true, trim: true, minLength: 2 },
        observacoes: { type: String, trim: true, maxLength: 1000 },
        planosAlimentares: { type: [planoAlimentarSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

// Criptografa antes de salvar (mesmo padrão do bcrypt no nutricionista)
pacienteSchema.pre("save", function () {
    if (this.isModified("email") && this.email) {
        this.email = encrypt(this.email);
    }

    if (this.isModified("dataNascimento") && this.dataNascimento) {
        this.dataNascimento = encrypt(String(this.dataNascimento));
    }
});

// Métodos para descriptografar ao ler os dados
pacienteSchema.methods.getEmailDescriptografado = function (): string | undefined {
    if (!this.email) {
        return undefined;
    }

    return decrypt(this.email);
};

pacienteSchema.methods.getDataNascimentoDescriptografada = function (): Date | undefined {
    if (!this.dataNascimento) {
        return undefined;
    }

    return new Date(decrypt(this.dataNascimento));
};

const Paciente = mongoose.model<IPacienteDB, PacienteModel>("Paciente", pacienteSchema);

export default Paciente;
