import crypto from "node:crypto";
import z from "zod";

const INodeEnvironmentSchema = z.enum(["development", "test", "production"]);
const IHex32ByteKeySchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{64}$/, "deve conter exatamente 32 bytes em hexadecimal.");
const IJwtSecretSchema = z
  .string()
  .trim()
  .min(32, "deve conter pelo menos 32 caracteres.")
  .refine(
    (value) => !/^(your|change|replace|troque|configure|exemplo)[-_]/i.test(value),
    "nao pode utilizar um valor de exemplo.",
  );
const IKeyFingerprintSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{64}$/, "deve ser um fingerprint SHA-256 em hexadecimal.");

const SENSITIVE_KEY_NAMES = [
  "ENCRYPTION_KEY",
  "SEARCH_HASH_KEY",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

type SensitiveKeyName = (typeof SENSITIVE_KEY_NAMES)[number];
type SensitiveKeys = Record<SensitiveKeyName, string>;

function getNodeEnvironment(environment: NodeJS.ProcessEnv) {
  const parsedEnvironment = INodeEnvironmentSchema.safeParse(
    environment.NODE_ENV?.trim().toLowerCase(),
  );

  if (!parsedEnvironment.success) {
    throw new Error(
      'NODE_ENV deve ser "development", "test" ou "production".',
    );
  }

  return parsedEnvironment.data;
}

function getRequiredEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  name: string,
) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`${name} e obrigatoria.`);
  }

  return value;
}

function validateKey(name: SensitiveKeyName, value: string) {
  const schema =
    name === "ENCRYPTION_KEY" || name === "SEARCH_HASH_KEY"
      ? IHex32ByteKeySchema
      : IJwtSecretSchema;
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new Error(`${name} ${result.error.issues[0]?.message ?? "invalida."}`);
  }
}

function normalizeKeyForComparison(name: SensitiveKeyName, value: string) {
  return name === "ENCRYPTION_KEY" || name === "SEARCH_HASH_KEY"
    ? value.toLowerCase()
    : value;
}

function getKeyFingerprint(name: SensitiveKeyName, value: string) {
  return crypto
    .createHash("sha256")
    .update(normalizeKeyForComparison(name, value), "utf8")
    .digest("hex");
}

function validateDevelopmentKeyIsolation(
  environment: NodeJS.ProcessEnv,
  keys: SensitiveKeys,
) {
  const productionFingerprints = SENSITIVE_KEY_NAMES.map((name) => {
    const fingerprintName = `PROD_${name}_FINGERPRINT`;
    const fingerprint = getRequiredEnvironmentValue(environment, fingerprintName);
    const result = IKeyFingerprintSchema.safeParse(fingerprint);

    if (!result.success) {
      throw new Error(
        `${fingerprintName} ${result.error.issues[0]?.message ?? "invalido."}`,
      );
    }

    return result.data.toLowerCase();
  });

  const productionFingerprintSet = new Set(productionFingerprints);
  const developmentUsesProductionKey = SENSITIVE_KEY_NAMES.some((name) =>
    productionFingerprintSet.has(getKeyFingerprint(name, keys[name])),
  );

  if (developmentUsesProductionKey) {
    throw new Error(
      "Configuracao insegura: chaves de desenvolvimento nao podem ser iguais as de producao.",
    );
  }
}

export function validarConfiguracaoChavesSensiveis(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const nodeEnvironment = getNodeEnvironment(environment);
  const keys = Object.fromEntries(
    SENSITIVE_KEY_NAMES.map((name) => [
      name,
      getRequiredEnvironmentValue(environment, name),
    ]),
  ) as SensitiveKeys;

  SENSITIVE_KEY_NAMES.forEach((name) => validateKey(name, keys[name]));

  const uniqueKeys = new Set(
    SENSITIVE_KEY_NAMES.map((name) => normalizeKeyForComparison(name, keys[name])),
  );
  if (uniqueKeys.size !== SENSITIVE_KEY_NAMES.length) {
    throw new Error("As chaves sensiveis devem ser unicas entre si.");
  }

  if (nodeEnvironment === "development") {
    validateDevelopmentKeyIsolation(environment, keys);
  }

  return {
    nodeEnvironment,
    keys,
  } as const;
}

export function obterChaveSensivel(name: SensitiveKeyName) {
  return validarConfiguracaoChavesSensiveis().keys[name];
}
