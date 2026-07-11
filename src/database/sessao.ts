import mongoose, { Schema } from "mongoose";

interface ISessaoDB {
  nutricionistaId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  previousRefreshTokenHash?: string;
  previousValidUntil?: Date;
  expiresAt: Date;
  revokedAt?: Date;
  lastUsedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const sessaoSchema = new Schema<ISessaoDB>(
  {
    nutricionistaId: {
      type: Schema.Types.ObjectId,
      ref: "Nutricionista",
      required: true,
      index: true,
    },
    refreshTokenHash: { type: String, required: true, select: false },
    previousRefreshTokenHash: { type: String, select: false },
    previousValidUntil: { type: Date },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

sessaoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessaoSchema.index({ nutricionistaId: 1, revokedAt: 1, expiresAt: 1 });

const Sessao = mongoose.model<ISessaoDB>("Sessao", sessaoSchema);

export default Sessao;
