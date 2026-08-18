import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  DEVELOPMENT_DATABASE_NAME,
  PRODUCTION_DATABASE_NAME,
  validarConfiguracaoBancoDeDados,
} from "../config/database.js";
import { Alimento } from "../database/alimento.js";
import CadastroPendente from "../database/cadastroPendente.js";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";
import Nutricionista from "../database/nutricionista.js";
import Paciente from "../database/paciente.js";
import PlanoAlimentar from "../database/planoAlimentar.js";
import Sessao from "../database/sessao.js";
import { logger } from "../utils/logger.js";

const DEVELOPMENT_VALIDATION_COLLECTION = "__development_connection_validation";
const applicationModels = [
  Alimento,
  CadastroPendente,
  Nutricionista,
  Paciente,
  PlanoAlimentar,
  Sessao,
] as const;

async function getDatabaseSnapshot(databaseName: string) {
  const database = mongoose.connection.getClient().db(databaseName);
  const collections = await database
    .listCollections({ type: "collection" }, { nameOnly: true })
    .toArray();
  const snapshotEntries = await Promise.all(
    collections
      .map(({ name }) => name)
      .sort()
      .map(async (collectionName) =>
        [
          collectionName,
          await database.collection(collectionName).estimatedDocumentCount(),
        ] as const,
      ),
  );

  return Object.fromEntries(snapshotEntries);
}

async function initializeDevelopmentDatabase() {
  const configuration = validarConfiguracaoBancoDeDados();

  if (
    configuration.nodeEnvironment !== "development" ||
    configuration.databaseName !== DEVELOPMENT_DATABASE_NAME
  ) {
    throw new Error(
      `Inicializacao recusada: use NODE_ENV=development e MONGO_DB_DATABASE_NAME=${DEVELOPMENT_DATABASE_NAME}.`,
    );
  }

  await conectarAoBancoDeDados();

  if (mongoose.connection.name !== DEVELOPMENT_DATABASE_NAME) {
    throw new Error("A conexao ativa nao aponta para o banco de desenvolvimento.");
  }

  const productionSnapshotBefore = await getDatabaseSnapshot(
    PRODUCTION_DATABASE_NAME,
  );

  await Promise.all(applicationModels.map((model) => model.init()));

  const developmentDatabase = mongoose.connection.getClient().db(
    DEVELOPMENT_DATABASE_NAME,
  );
  const expectedCollections = applicationModels
    .map((model) => model.collection.collectionName)
    .sort();
  const developmentCollections = await developmentDatabase
    .listCollections({ type: "collection" }, { nameOnly: true })
    .toArray();
  const developmentCollectionNames = developmentCollections
    .map(({ name }) => name)
    .sort();
  const missingCollections = expectedCollections.filter(
    (name) => !developmentCollectionNames.includes(name),
  );

  if (missingCollections.length > 0) {
    throw new Error(
      `Collections de desenvolvimento ausentes: ${missingCollections.join(", ")}.`,
    );
  }

  const applicationDocumentCounts = await Promise.all(
    expectedCollections.map(async (collectionName) => ({
      collectionName,
      count: await developmentDatabase
        .collection(collectionName)
        .estimatedDocumentCount(),
    })),
  );
  const nonEmptyCollections = applicationDocumentCounts.filter(
    ({ count }) => count > 0,
  );

  if (nonEmptyCollections.length > 0) {
    throw new Error(
      "O banco de desenvolvimento ja contem dados. Nenhum documento foi removido.",
    );
  }

  const validationId = crypto.randomUUID();
  const developmentValidationCollection = developmentDatabase.collection(
    DEVELOPMENT_VALIDATION_COLLECTION,
  );
  const productionValidationCollection = mongoose.connection
    .getClient()
    .db(PRODUCTION_DATABASE_NAME)
    .collection(DEVELOPMENT_VALIDATION_COLLECTION);

  try {
    await developmentValidationCollection.insertOne({
      validationId,
      createdAt: new Date(),
    });

    const [developmentMatches, productionMatches] = await Promise.all([
      developmentValidationCollection.countDocuments({ validationId }),
      productionValidationCollection.countDocuments({ validationId }),
    ]);

    if (developmentMatches !== 1 || productionMatches !== 0) {
      throw new Error("A separacao entre os bancos nao foi validada.");
    }
  } finally {
    await developmentValidationCollection.deleteOne({ validationId });

    if ((await developmentValidationCollection.estimatedDocumentCount()) === 0) {
      await developmentValidationCollection.drop();
    }
  }

  const productionSnapshotAfter = await getDatabaseSnapshot(
    PRODUCTION_DATABASE_NAME,
  );

  if (
    JSON.stringify(productionSnapshotBefore) !==
    JSON.stringify(productionSnapshotAfter)
  ) {
    throw new Error(
      "O estado observado do banco de producao mudou durante a validacao.",
    );
  }

  logger.info("development_database_initialized", {
    databaseName: DEVELOPMENT_DATABASE_NAME,
    collections: expectedCollections,
    productionSnapshotUnchanged: true,
    validationDocumentRemoved: true,
  });
}

async function main() {
  try {
    await initializeDevelopmentDatabase();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  logger.error("development_database_initialization_failed", error);
  process.exitCode = 1;
});
