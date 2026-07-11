import crypto from "node:crypto";

const AES_GCM_ALGORITHM = "aes-256-gcm";
const AES_GCM_PREFIX = "v1.gcm";
const AES_GCM_IV_LENGTH = 12;
const AES_GCM_AUTH_TAG_LENGTH = 16;
const LEGACY_AES_CBC_ALGORITHM = "aes-256-cbc";

export const PATIENT_DIET_PLAN_CONTEXT = "paciente:plano-alimentar";

function getSecretKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey || !/^[a-fA-F0-9]{64}$/.test(encryptionKey)) {
    throw new Error(
      "ENCRYPTION_KEY deve conter exatamente 32 bytes em hexadecimal.",
    );
  }

  return Buffer.from(encryptionKey, "hex");
}

function isHexWithLength(value: string | undefined, length: number) {
  return Boolean(value && value.length === length && /^[a-fA-F0-9]+$/.test(value));
}

function isEvenLengthHex(value: string | undefined) {
  return Boolean(
    value && value.length > 0 && value.length % 2 === 0 && /^[a-fA-F0-9]+$/.test(value),
  );
}

export function isAesGcmEncrypted(value: string) {
  const [version, mode, ivHex, authTagHex, encryptedHex, ...extraParts] = value.split(".");

  return (
    version === "v1" &&
    mode === "gcm" &&
    extraParts.length === 0 &&
    isHexWithLength(ivHex, AES_GCM_IV_LENGTH * 2) &&
    isHexWithLength(authTagHex, AES_GCM_AUTH_TAG_LENGTH * 2) &&
    isEvenLengthHex(encryptedHex)
  );
}

function isLegacyAesCbcEncrypted(value: string) {
  const [ivHex, encryptedHex, ...extraParts] = value.split(":");

  return (
    extraParts.length === 0 &&
    isHexWithLength(ivHex, 32) &&
    isEvenLengthHex(encryptedHex)
  );
}

export function encryptString(value: string, context: string) {
  const iv = crypto.randomBytes(AES_GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_GCM_ALGORITHM, getSecretKey(), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    AES_GCM_PREFIX,
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
}

function decryptAesGcm(value: string, context: string) {
  const [, , ivHex, authTagHex, encryptedHex] = value.split(".");
  const decipher = crypto.createDecipheriv(
    AES_GCM_ALGORITHM,
    getSecretKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function decryptLegacyAesCbc(value: string) {
  const [ivHex, encryptedHex] = value.split(":");
  const decipher = crypto.createDecipheriv(
    LEGACY_AES_CBC_ALGORITHM,
    getSecretKey(),
    Buffer.from(ivHex, "hex"),
  );

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export function decryptString(value: string, context: string) {
  if (isAesGcmEncrypted(value)) {
    return decryptAesGcm(value, context);
  }

  if (value.startsWith(`${AES_GCM_PREFIX}.`)) {
    throw new Error("Conteudo AES-GCM invalido ou corrompido.");
  }

  if (isLegacyAesCbcEncrypted(value)) {
    return decryptLegacyAesCbc(value);
  }

  return value;
}

export function encryptStringIfNeeded(value: string, context: string) {
  if (isAesGcmEncrypted(value)) {
    return value;
  }

  return encryptString(decryptString(value, context), context);
}

export function encryptJson(value: unknown, context: string) {
  return encryptString(JSON.stringify(value), context);
}

export function decryptJson<T>(value: string, context: string): T {
  return JSON.parse(decryptString(value, context)) as T;
}
