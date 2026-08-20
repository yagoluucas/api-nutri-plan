import { NextFunction, Request, Router } from "express";
import mongoose from "mongoose";
import Paciente from "../../database/paciente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  IIdPacienteParamsSchema,
  IRetornoApiSchema,
} from "../../interfaces/generalInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { deletarPlanosAlimentares } from "../planoAlimentar/deletarPlanoAlimentar.js";
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
        const pacienteDeletado = await Paciente.findOneAndDelete(
          {
            _id: pacienteParams.data.idPaciente,
            idNutricionista,
          },
          { session },
        );

        if (!pacienteDeletado) {
          throw new Error("Paciente nao encontrado", {
            cause: {
              cause: "Not Found",
              internalCause: "Data Not Found",
              statusCode: 404,
            } as IErrorCause,
          });
        }

        await deletarPlanosAlimentares(
          [pacienteParams.data.idPaciente],
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    return IRetornoApiSchema.parse({
      message: "Paciente excluido com sucesso",
      error: false,
      statusCode: 200,
    });
  } catch (error) {
    console.log(`[Deletar Paciente] - Error: ${error}`);
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
