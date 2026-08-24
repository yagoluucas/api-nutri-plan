import { NextFunction, Request, Router } from "express";
import mongoose from "mongoose";
import { addDays, archiveRetention } from "../../config/archiveRetention.js";
import Paciente from "../../database/paciente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  IIdPacienteParamsSchema,
  IRetornoApiSchema,
} from "../../interfaces/generalInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { logger } from "../../utils/logger.js";
import { arquivarPlanosAlimentares } from "../planoAlimentar/deletarPlanoAlimentar.js";
import { getIdNutricionistaAutenticado } from "./pacienteHelpers.js";

async function deletarPaciente(req: Request, next: NextFunction) {
  const pacienteParams = IIdPacienteParamsSchema.safeParse(req.params);

  if (!pacienteParams.success) {
    next(pacienteParams.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();

    const idNutricionista = getIdNutricionistaAutenticado(req, next);

    if (!idNutricionista) {
      return;
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const archivedAt = new Date();
        const pacienteArquivado = await Paciente.findOneAndUpdate(
          {
            _id: pacienteParams.data.idPaciente,
            idNutricionista,
            archivedAt: { $exists: false },
          },
          {
            $set: {
              archivedAt,
              purgeAt: addDays(archivedAt, archiveRetention.pacienteDays),
            },
          },
          { session, new: true },
        );

        if (!pacienteArquivado) {
          throw new Error("Paciente nao encontrado", {
            cause: {
              cause: "Not Found",
              internalCause: "Data Not Found",
              statusCode: 404,
            } as IErrorCause,
          });
        }

        await arquivarPlanosAlimentares(
          [pacienteParams.data.idPaciente],
          archivedAt,
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    return IRetornoApiSchema.parse({
      message: "Paciente arquivado com sucesso",
      error: false,
      statusCode: 200,
    });
  } catch (error) {
    logger.error("patient_archive_failed", error);
    next(error);
  }
}

const deletarPacienteRouter = Router();

deletarPacienteRouter.delete(
  "/:idPaciente",
  authMiddleware,
  async (req, res, next) => {
    const result = await deletarPaciente(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { deletarPacienteRouter };
