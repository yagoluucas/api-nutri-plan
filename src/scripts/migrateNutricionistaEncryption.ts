import "dotenv/config";
import mongoose from "mongoose";
import Nutricionista from "../database/nutricionista.js";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";
import { isAesGcmEncrypted } from "../utils/encryption.js";
import { installConsoleRedaction, logger } from "../utils/logger.js";

installConsoleRedaction();

const CAMPOS_OBRIGATORIOS = [
  "nome",
  "sobrenome",
  "email",
  "dataNascimento",
  "crn",
] as const;

function campoObrigatorioMigrado(value: unknown) {
  return typeof value === "string" && isAesGcmEncrypted(value);
}

function nutricionistaEstaMigrado(nutricionista: {
  get(path: string): unknown;
}) {
  const possuiHashes =
    typeof nutricionista.get("emailHash") === "string" &&
    typeof nutricionista.get("crnHash") === "string";

  return (
    possuiHashes &&
    CAMPOS_OBRIGATORIOS.every((campo) =>
      campoObrigatorioMigrado(nutricionista.get(campo)),
    )
  );
}

async function migrarNutricionistas() {
  await conectarAoBancoDeDados();

  let processados = 0;
  let migrados = 0;
  let ignorados = 0;
  let erros = 0;

  const cursor = Nutricionista.find()
    .select("+senha +emailHash +crnHash")
    .cursor();

  for await (const nutricionista of cursor) {
    processados += 1;

    try {
      if (nutricionistaEstaMigrado(nutricionista)) {
        ignorados += 1;
        continue;
      }

      const dataNascimento =
        nutricionista.getDataNascimentoDescriptografada();

      if (!dataNascimento) {
        throw new Error("Data de nascimento do nutricionista invalida.");
      }

      nutricionista.set("nome", nutricionista.getNomeDescriptografado());
      nutricionista.set(
        "sobrenome",
        nutricionista.getSobrenomeDescriptografado(),
      );
      nutricionista.set("email", nutricionista.getEmailDescriptografado());
      nutricionista.set("dataNascimento", dataNascimento);
      nutricionista.set("crn", nutricionista.getCrnDescriptografado());

      await nutricionista.save({ validateModifiedOnly: true });
      migrados += 1;
    } catch (error) {
      erros += 1;
      logger.error("nutritionist_encryption_migration_document_failed", error, {
        processados,
      });
    }
  }

  logger.info("nutritionist_encryption_migration_completed", {
    processados,
    migrados,
    ignorados,
    erros,
  });

  return { erros };
}

migrarNutricionistas()
  .then(async ({ erros }) => {
    await mongoose.disconnect();

    if (erros > 0) {
      process.exitCode = 1;
    }
  })
  .catch(async (error: unknown) => {
    logger.error("nutritionist_encryption_migration_failed", error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
