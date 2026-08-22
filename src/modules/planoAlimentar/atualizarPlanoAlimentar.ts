import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import PlanoAlimentar from "../../database/planoAlimentar.js";
import {
  IAtualizarPlanoAlimentarRequestSchema,
  IPlanoAlimentarParamsSchema,
  IPlanoAlimentarSchema,
  IRetornoPlanoAlimentarSchema,
} from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarPacienteAutorizado,
  getIdNutricionistaAutenticado,
} from "../pacientes/pacienteHelpers.js";
import {
  descriptografarPlanoAlimentar,
  nextPlanoAlimentarNaoEncontrado,
  normalizarPlanoAlimentar,
  protegerPlanoAlimentar,
} from "./planoAlimentarHelpers.js";

async function atualizarPlanoAlimentar(req: Request, next: NextFunction) {
  const params = IPlanoAlimentarParamsSchema.safeParse(req.params);

  if (!params.success) {
    next(params.error);
    return;
  }

  const planoSafe = IAtualizarPlanoAlimentarRequestSchema.safeParse(req.body);

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

    const plano = await PlanoAlimentar.findOne({
      _id: params.data.idPlano,
      idPaciente: params.data.idPaciente,
      archivedAt: { $exists: false },
    });

    if (!plano) {
      nextPlanoAlimentarNaoEncontrado(next);
      return;
    }

    const planoAtual = descriptografarPlanoAlimentar(plano);
    const { planoAtivo, ...camposPlanoAlimentar } =
      planoSafe.data.planoAlimentar;
    const planoAtualizado = IPlanoAlimentarSchema.parse({
      ...planoAtual,
      ...camposPlanoAlimentar,
    });
    const planoProtegido = protegerPlanoAlimentar(planoAtualizado);

    plano.conteudoProtegido = planoProtegido.conteudoProtegido;

    if (typeof planoAtivo === "boolean") {
      plano.planoAtivo = planoAtivo;
    }

    await plano.save({ validateModifiedOnly: true });

    return IRetornoPlanoAlimentarSchema.parse({
      message: "Plano alimentar atualizado com sucesso",
      error: false,
      statusCode: 200,
      planoAlimentar: normalizarPlanoAlimentar(plano),
    });
  } catch (error) {
    console.log(`[Atualizar Plano Alimentar] - Error: ${error}`);
    next(error);
  }
}

const atualizarPlanoAlimentarRouter = Router();

atualizarPlanoAlimentarRouter.patch(
  "/:idPaciente/planos-alimentares/:idPlano",
  authMiddleware,
  async (req, res, next) => {
    const result = await atualizarPlanoAlimentar(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { atualizarPlanoAlimentarRouter };
