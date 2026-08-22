import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import PlanoAlimentar from "../../database/planoAlimentar.js";
import { IIdPacienteParamsSchema } from "../../interfaces/generalInterfaces.js";
import {
  IRetornoPlanosAlimentaresSchema,
} from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarPacienteAutorizado,
  getIdNutricionistaAutenticado,
} from "../pacientes/pacienteHelpers.js";
import { isPlanoAlimentarValido, normalizarPlanoAlimentar } from "./planoAlimentarHelpers.js";

export async function buscarPlanosAlimentares(req: Request, next: NextFunction) {
  const params = IIdPacienteParamsSchema.safeParse(req.params);

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

    const planosAlimentares = await PlanoAlimentar.find({
      idPaciente: params.data.idPaciente,
      archivedAt: { $exists: false },
    }).sort({ createdAt: -1 });

    return IRetornoPlanosAlimentaresSchema.parse({
      message: "Planos alimentares recuperados com sucesso",
      error: false,
      statusCode: 200,
      planosAlimentares: planosAlimentares
        .filter(isPlanoAlimentarValido)
        .map(normalizarPlanoAlimentar),
    });
  } catch (error) {
    console.log(`[Buscar Planos Alimentares] - Error: ${error}`);
    next(error);
  }
}

const buscarPlanoAlimentarRouter = Router();

buscarPlanoAlimentarRouter.get(
  "/:idPaciente/planos-alimentares",
  authMiddleware,
  async (req, res, next) => {
    const result = await buscarPlanosAlimentares(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { buscarPlanoAlimentarRouter };
