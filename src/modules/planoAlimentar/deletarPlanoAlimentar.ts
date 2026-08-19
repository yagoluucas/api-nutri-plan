import { NextFunction, Request, Router } from "express";
import type { ClientSession } from "mongoose";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import Paciente from "../../database/paciente.js";
import PlanoAlimentar from "../../database/planoAlimentar.js";
import { IRetornoApiSchema } from "../../interfaces/generalInterfaces.js";
import { IPlanoAlimentarParamsSchema } from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarPacienteAutorizado,
  getIdNutricionistaAutenticado,
} from "../pacientes/pacienteHelpers.js";
import { nextPlanoAlimentarNaoEncontrado } from "./planoAlimentarHelpers.js";

async function deletarPlanosAlimentares(
  idPaciente: string,
  session: ClientSession,
) {
  await PlanoAlimentar.deleteMany(
    { idPaciente },
    { session },
  );
}

async function deletarPlanoAlimentar(req: Request, next: NextFunction) {
  const params = IPlanoAlimentarParamsSchema.safeParse(req.params);

  if (!params.success) {
    next(params.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();

    const idNutricionista = getIdNutricionistaAutenticado(req, next);

    if (!idNutricionista) {
      return;
    }

    const paciente = await buscarPacienteAutorizado(
      params.data.idPaciente,
      idNutricionista,
      next,
    );

    if (!paciente) {
      return;
    }

    const planoAlimentarRemovido = await PlanoAlimentar.deleteOne({
      _id: params.data.idPlano,
      idPaciente: params.data.idPaciente,
    });

    if (planoAlimentarRemovido.deletedCount === 0) {
      nextPlanoAlimentarNaoEncontrado(next);
      return;
    }

    await Paciente.updateOne(
      {
        _id: params.data.idPaciente,
        idNutricionista,
        qtdPlanos: { $gt: 0 },
      },
      {
        $inc: {
          qtdPlanos: -1,
        },
      },
    );

    return IRetornoApiSchema.parse({
      message: "Plano alimentar excluido com sucesso",
      error: false,
      statusCode: 200,
    });
  } catch (error) {
    console.log(`[Deletar Plano Alimentar] - Error: ${error}`);
    next(error);
  }
}

const deletarPlanoAlimentarRouter = Router();

deletarPlanoAlimentarRouter.delete(
  "/:idPaciente/planos-alimentares/:idPlano",
  authMiddleware,
  async (req, res, next) => {
    const result = await deletarPlanoAlimentar(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { deletarPlanoAlimentarRouter, deletarPlanosAlimentares };
