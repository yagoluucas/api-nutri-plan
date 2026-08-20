import { NextFunction, Request, Router } from "express";
import mongoose from "mongoose";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { getIdNutricionistaAutenticado } from "./nutricionistaHelpers.js";
import Nutricionista from "../../database/nutricionista.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { IRetornoApiSchema } from "../../interfaces/generalInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import Paciente from "../../database/paciente.js";
import Sessao from "../../database/sessao.js";
import { deletarPlanosAlimentares } from "../planoAlimentar/deletarPlanoAlimentar.js";

async function deletarNutricionista(req: Request, next: NextFunction) {
  try {
    await conectarAoBancoDeDados();

    const idNutricionista = getIdNutricionistaAutenticado(req, next);

    if (!idNutricionista) {
      return;
    }

    const session = await mongoose.startSession();

    try {
      const resultadoTransacao = await session.withTransaction(async () => {
        const nutricionistaDeletado = await Nutricionista.findOneAndDelete(
          { _id: idNutricionista },
          { session },
        );

        if (!nutricionistaDeletado) {
          throw new Error("Nutricionista nao encontrado", {
            cause: {
              cause: "Not Found",
              internalCause: "Data Not Found",
              statusCode: 404,
            } as IErrorCause,
          });
        }

        const pacientes = await Paciente.find(
          { idNutricionista },
          { _id: 1 },
          { session },
        ).lean();

        const idsPacientes = pacientes.map((paciente) =>
          String(paciente._id),
        );

        await deletarPlanosAlimentares(idsPacientes, session);

        const pacientesDeletados = await Paciente.deleteMany(
          { idNutricionista },
          { session },
        );

        await Sessao.deleteMany(
          { nutricionistaId: idNutricionista },
          { session },
        );

        return {
          quantidadePacientesDeletados: pacientesDeletados.deletedCount,
        };
      });

      if (!resultadoTransacao) {
        throw new Error("Erro ao deletar nutricionista", {
          cause: {
            cause: "Internal Server Error",
            internalCause: "Unexpected Error",
            statusCode: 500,
          } as IErrorCause,
        });
      }

      const mensagemQuantidadePacientesDeletados =
        resultadoTransacao.quantidadePacientesDeletados === 1
          ? "paciente"
          : "pacientes";

      return IRetornoApiSchema.parse({
        message: `Nutricionista e ${resultadoTransacao.quantidadePacientesDeletados} ${mensagemQuantidadePacientesDeletados} deletados`,
        error: false,
        statusCode: 200,
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    next(error);
  }
}

const deletarNutricionistaRouter = Router();

deletarNutricionistaRouter.delete(
  "/",
  authMiddleware,
  async (req, res, next) => {
    const result = await deletarNutricionista(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { deletarNutricionistaRouter };
