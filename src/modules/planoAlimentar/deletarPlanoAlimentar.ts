import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import Paciente from "../../database/paciente.js";
import { IRetornoApiSchema } from "../../interfaces/generalInterfaces.js";
import { IPlanoAlimentarParamsSchema } from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarPacienteAutorizado,
  getIdNutricionistaAutenticado,
} from "../pacientes/pacienteHelpers.js";
import {
  buscarIndicePlanoAlimentar,
  nextPlanoAlimentarNaoEncontrado,
} from "./planoAlimentarHelpers.js";

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

    const planosAlimentares = paciente.planosAlimentares ?? [];
    const indicePlano = buscarIndicePlanoAlimentar(
      planosAlimentares,
      params.data.idPlano,
    );

    if (indicePlano === -1) {
      nextPlanoAlimentarNaoEncontrado(next);
      return;
    }

    const planoAlimentarRemovido = await Paciente.updateOne(
      {
        _id: params.data.idPaciente,
        idNutricionista,
        "planosAlimentares._id": params.data.idPlano,
      },
      {
        $pull: {
          planosAlimentares: {
            _id: params.data.idPlano,
          },
        },
      },
    );

    if (planoAlimentarRemovido.modifiedCount === 0) {
      nextPlanoAlimentarNaoEncontrado(next);
      return;
    }

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

export { deletarPlanoAlimentarRouter };
