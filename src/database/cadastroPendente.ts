import mongoose, { Schema } from "mongoose";
import {
  ICadastroPendenteDB,
  IDeliveryStatusSchema,
} from "../interfaces/auth/emailConfirmationInterfaces.js";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const cadastroPendenteSchema = new Schema<ICadastroPendenteDB>(
  {
    registrationDataEncrypted: {
      type: String,
      required: true,
      select: false,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      match: BCRYPT_HASH_PATTERN,
    },
    emailHash: {
      type: String,
      required: true,
      select: false,
      match: SHA256_HEX_PATTERN,
    },
    crnHash: {
      type: String,
      required: true,
      select: false,
      match: SHA256_HEX_PATTERN,
    },
    initialIpHash: {
      type: String,
      required: true,
      select: false,
      match: SHA256_HEX_PATTERN,
    },
    lastIpHash: {
      type: String,
      required: true,
      select: false,
      match: SHA256_HEX_PATTERN,
    },
    confirmationTokenHash: {
      type: String,
      required: true,
      select: false,
      match: SHA256_HEX_PATTERN,
    },
    deliveryStatus: {
      type: String,
      enum: IDeliveryStatusSchema.options,
      required: true,
      default: "pending",
    },
    registrationAttemptCount: { type: Number, required: true, default: 1 },
    emailSendCount: { type: Number, required: true, default: 0 },
    lastAttemptAt: { type: Date, required: true },
    lastEmailSentAt: { type: Date },
    confirmationExpiresAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    collection: "cadastrosPendentes",
    timestamps: true,
  },
);

cadastroPendenteSchema.index({ emailHash: 1 }, { unique: true });
cadastroPendenteSchema.index({ crnHash: 1 }, { unique: true });
cadastroPendenteSchema.index(
  { confirmationTokenHash: 1 },
  { unique: true },
);
cadastroPendenteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CadastroPendente = mongoose.model<ICadastroPendenteDB>(
  "CadastroPendente",
  cadastroPendenteSchema,
);

export default CadastroPendente;
