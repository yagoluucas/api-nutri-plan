import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import Paciente from "../../database/paciente.js";
import PlanoAlimentar from "../../database/planoAlimentar.js";
import { IIdPacienteParamsSchema } from "../../interfaces/generalInterfaces.js";
import {
  ICadastrarPlanoAlimentarRequestSchema,
  IRetornoPlanoAlimentarSchema,
} from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarPacienteAutorizado,
  getIdNutricionistaAutenticado,
} from "../pacientes/pacienteHelpers.js";
import {
  normalizarPlanoAlimentar,
  protegerPlanoAlimentar,
} from "./planoAlimentarHelpers.js";

async function cadastrarPlanoAlimentar(req: Request, next: NextFunction) {
  const params = IIdPacienteParamsSchema.safeParse(req.params);

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

    const { planoAtivo, ...planoAlimentar } = planoSafe.data.planoAlimentar;
    const planoCriado = await PlanoAlimentar.create({
      idPaciente: params.data.idPaciente,
      planoAtivo: planoAtivo ?? true,
      ...protegerPlanoAlimentar(planoAlimentar),
    });

    await Paciente.updateOne(
      {
        _id: params.data.idPaciente,
        idNutricionista,
      },
      {
        $inc: {
          qtdPlanos: 1,
        },
      },
    );

    return IRetornoPlanoAlimentarSchema.parse({
      message: "Plano alimentar cadastrado com sucesso",
      error: false,
      statusCode: 201,
      planoAlimentar: normalizarPlanoAlimentar(planoCriado),
    });
  } catch (error) {
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
