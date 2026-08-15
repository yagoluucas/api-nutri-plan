import "dotenv/config";
import mongoose from "mongoose";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";
import PlanoAlimentar from "../database/planoAlimentar.js";
import { IPlanoAlimentarSchema } from "../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import { protegerPlanoAlimentar } from "../modules/planoAlimentar/planoAlimentarHelpers.js";
import { logger } from "../utils/logger.js";

const LEGACY_DIET_PLAN_FIELDS = {
  tituloPlano: "",
  objetivoDoPlano: "",
  observacoesGerais: "",
  refeicoes: "",
} as const;

async function migrarPlanosAlimentaresLegados() {
  let planosCriptografados = 0;
  let planosInvalidos = 0;
  let planosIgnoradosPorConcorrencia = 0;

  await conectarAoBancoDeDados();

  const cursor = PlanoAlimentar.collection.find({
    conteudoProtegido: null,
  });

  for await (const planoLegado of cursor) {
    const planoValidado = IPlanoAlimentarSchema.safeParse({
      tituloPlano: planoLegado.tituloPlano,
      objetivoDoPlano: planoLegado.objetivoDoPlano,
      observacoesGerais: planoLegado.observacoesGerais,
      refeicoes: planoLegado.refeicoes,
    });

    if (!planoValidado.success) {
      planosInvalidos += 1;
      continue;
    }

    const planoProtegido = protegerPlanoAlimentar(planoValidado.data);
    const resultado = await PlanoAlimentar.collection.updateOne(
      {
        _id: planoLegado._id,
        conteudoProtegido: null,
      },
      {
        $set: {
          conteudoProtegido: planoProtegido.conteudoProtegido,
          updatedAt: new Date(),
        },
        $unset: LEGACY_DIET_PLAN_FIELDS,
      },
    );

    if (resultado.modifiedCount === 1) {
      planosCriptografados += 1;
    } else {
      planosIgnoradosPorConcorrencia += 1;
    }
  }

  logger.info("diet_plan_encryption_migration_finished", {
    planosCriptografados,
    planosInvalidos,
    planosIgnoradosPorConcorrencia,
  });

  if (planosInvalidos > 0) {
    throw new Error(
      "Existem planos alimentares legados invalidos. Nenhum plano invalido foi alterado.",
    );
  }
}

async function main() {
  try {
    await migrarPlanosAlimentaresLegados();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  logger.error("diet_plan_encryption_migration_failed", error);
  process.exitCode = 1;
});
