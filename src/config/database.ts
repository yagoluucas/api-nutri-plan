import z from "zod";

export const PRODUCTION_DATABASE_NAME = "aplicacao_nutricional";
export const DEVELOPMENT_DATABASE_NAME = "aplicacao_nutricional_dev";

const INodeEnvironmentSchema = z.enum(["development", "test", "production"]);
const IMongoDatabaseNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(63)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "MONGO_DB_DATABASE_NAME deve conter apenas letras, numeros, hifen ou sublinhado.",
  );

export function validarConfiguracaoBancoDeDados(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const nodeEnvironment = INodeEnvironmentSchema.safeParse(
    environment.NODE_ENV?.trim().toLowerCase(),
  );

  if (!nodeEnvironment.success) {
    throw new Error(
      'NODE_ENV deve ser "development", "test" ou "production".',
    );
  }

  if (!environment.MONGO_DB_DATABASE_NAME?.trim()) {
    throw new Error("MONGO_DB_DATABASE_NAME e obrigatorio.");
  }

  const databaseName = IMongoDatabaseNameSchema.safeParse(
    environment.MONGO_DB_DATABASE_NAME,
  );

  if (!databaseName.success) {
    throw new Error(
      databaseName.error.issues[0]?.message ??
        "MONGO_DB_DATABASE_NAME nao foi configurado corretamente.",
    );
  }

  if (
    nodeEnvironment.data !== "production" &&
    databaseName.data === PRODUCTION_DATABASE_NAME
  ) {
    const environmentLabel =
      nodeEnvironment.data === "test" ? "teste" : "desenvolvimento";

    throw new Error(
      `Configuracao insegura: o ambiente de ${environmentLabel} nao pode utilizar o banco de producao "${PRODUCTION_DATABASE_NAME}".`,
    );
  }

  return {
    nodeEnvironment: nodeEnvironment.data,
    databaseName: databaseName.data,
  };
}
