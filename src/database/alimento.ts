import mongoose, { Schema } from 'mongoose';
import type { INutriente, IMedidasCaseiras, IAlimento } from '../interfaces/alimentos/modelAlimentosInterface.js';

// O Schema define a estrutura dos documentos que serão armazenados na coleção
const nutrientesSchema = new Schema<INutriente>(
    {
        nomeComponente: { type: String, required: true, trim: true },
        valorPor100G: { type: Number, default: null },
        unidadeUtilizada: { type: String, required: true, trim: true }
    },
    { _id: false }
);

const medidasCaseirasSchema = new Schema<IMedidasCaseiras>(
    {
        nomeMedida: { type: String, required: true, trim: true },
        total: { type: Number, required: true, min: 0 },
        unidadeMedida: { type: String, required: true, trim: true },
        tipoMedida: { type: String, required: true, trim: true, enum: ["Caseira", "Tecnica"] }
    },
    { _id: false }
);

const alimentoSchema = new Schema<IAlimento>(
    {
        codigoAlimento: { type: String, required: true, trim: true },
        nomeAlimento: { type: String, required: true, trim: true },
        linkAlimento: { type: String, required: true, trim: true },
        grupo: { type: String, trim: true, default: null },
        marca: { type: String, trim: true, default: null },
        nutrientes: [nutrientesSchema],
        medidasCaseiras: [medidasCaseirasSchema]
    },
    {
        timestamps: true, // serve para adicionar data de criação e modificação
        collection: "alimentos"
    }
);

// Criação de index
alimentoSchema.index({ codigoAlimento: 1 }, { unique: true }); // Único e para facilitar busca
alimentoSchema.index({ nomeAlimento: "text" }); // Para facilitar busca
alimentoSchema.index({ "nutrientes.nomeComponente": 1}); // Para facilitar busca

// Criação do Model
export const Alimento = mongoose.model<IAlimento>("Alimento", alimentoSchema);