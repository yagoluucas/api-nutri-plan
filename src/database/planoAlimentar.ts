import mongoose, { Schema } from "mongoose";
import {
  IPlanoAlimentarDB,
  PlanoAlimentarModel,
} from "../interfaces/planoAlimentar/planoAlimentarInterfaces.js";

const planoAlimentarSchema = new Schema<IPlanoAlimentarDB, PlanoAlimentarModel>(
  {
    idPaciente: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    planoAtivo: {
      type: Boolean,
      default: true,
    },
    conteudoProtegido: {
      type: String,
      required: true,
    },
    archivedAt: { type: Date },
    purgeAt: { type: Date },
  },
  {
    collection: "plano_alimentar",
    timestamps: true,
  },
);

planoAlimentarSchema.index({ idPaciente: 1, createdAt: -1 });
planoAlimentarSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

const PlanoAlimentar = mongoose.model<IPlanoAlimentarDB, PlanoAlimentarModel>(
  "PlanoAlimentar",
  planoAlimentarSchema,
);

export default PlanoAlimentar;
