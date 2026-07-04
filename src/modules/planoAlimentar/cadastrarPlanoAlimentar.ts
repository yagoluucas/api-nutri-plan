import { NextFunction, Request, Router } from "express";
import mongoose from "mongoose";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import Paciente from "../../database/paciente.js";
import {
  ICadastrarPlanoAlimentarRequestSchema,
  IPlanoAlimentarPacienteParamsSchema,
  IRetornoPlanoAlimentarSchema,
} from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarPacienteAutorizado,
  getIdNutricionistaAutenticado,
} from "../pacientes/pacienteHelpers.js";
import { normalizarPlanoAlimentar } from "./planoAlimentarHelpers.js";

async function cadastrarPlanoAlimentar(req: Request, next: NextFunction) {
  const params = IPlanoAlimentarPacienteParamsSchema.safeParse(req.params);

  if (!params.success) {
    next(params.error);
    return;
  }

  const planoSafe = ICadastrarPlanoAlimentarRequestSchema.safeParse(req.body);

  if (!planoSafe.success) {
    next(planoSafe.error);
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

    const idPlano = new mongoose.Types.ObjectId();
    const planoCriado = {
      _id: idPlano,
      ...planoSafe.data.planoAlimentar,
    };

    await Paciente.updateOne(
      {
        _id: params.data.idPaciente,
        idNutricionista,
      },
      {
        $push: {
          planosAlimentares: planoCriado,
        },
      },
      {
        runValidators: true,
      },
    );

    return IRetornoPlanoAlimentarSchema.parse({
      message: "Plano alimentar cadastrado com sucesso",
      error: false,
      statusCode: 201,
      planoAlimentar: normalizarPlanoAlimentar(planoCriado),
    });
  } catch (error) {
    console.log(`[Cadastrar Plano Alimentar] - Error: ${error}`);
    next(error);
  }
}

const cadastrarPlanoAlimentarRouter = Router();

cadastrarPlanoAlimentarRouter.post(
  "/:idPaciente/planos-alimentares",
  authMiddleware,
  async (req, res, next) => {
    const result = await cadastrarPlanoAlimentar(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { cadastrarPlanoAlimentarRouter };
