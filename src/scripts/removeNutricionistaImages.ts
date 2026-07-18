import "dotenv/config";
import mongoose from "mongoose";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";
import { installConsoleRedaction, logger } from "../utils/logger.js";

installConsoleRedaction();

async function removerImagensNutricionistas() {
  await conectarAoBancoDeDados();

  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("Banco de dados nao conectado.");
  }

  const collection = database.collection("nutricionistas");
  const filtro = {
    $or: [
      { imagemPerfil: { $exists: true } },
      { imagemCapa: { $exists: true } },
    ],
  };

  const documentosComImagem = await collection.countDocuments(filtro);
  const resultado = await collection.updateMany(filtro, {
    $unset: {
      imagemPerfil: "",
      imagemCapa: "",
    },
  });

  logger.info("nutritionist_images_removed", {
    documentosComImagem,
    matchedCount: resultado.matchedCount,
    modifiedCount: resultado.modifiedCount,
  });
}

removerImagensNutricionistas()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error: unknown) => {
    logger.error("nutritionist_images_remove_failed", error);
    await mongoose.disconnect().catch(() => undefined);
    process.exitCode = 1;
  });
