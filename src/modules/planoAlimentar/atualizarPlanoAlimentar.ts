import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import Paciente from "../../database/paciente.js";
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
  buscarIndicePlanoAlimentar,
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

    const planosAlimentares = paciente.planosAlimentares ?? [];
    const indicePlano = buscarIndicePlanoAlimentar(
      planosAlimentares,
      params.data.idPlano,
    );

    if (indicePlano === -1) {
      nextPlanoAlimentarNaoEncontrado(next);
      return;
    }

    const planoAtual = descriptografarPlanoAlimentar(
      planosAlimentares[indicePlano],
    );
    const { planoAtivo, ...camposPlanoAlimentar } =
      planoSafe.data.planoAlimentar;
    const planoAtualizado = IPlanoAlimentarSchema.parse({
      ...planoAtual,
      ...camposPlanoAlimentar,
    });
    const planoProtegido = protegerPlanoAlimentar(planoAtualizado);
    const camposAtualizados: Record<string, string | boolean> = {
      "planosAlimentares.$.conteudoProtegido": planoProtegido.conteudoProtegido,
    };

    if (typeof planoAtivo === "boolean") {
      camposAtualizados["planosAlimentares.$.planoAtivo"] = planoAtivo;
    }

    const pacienteAtualizado = await Paciente.findOneAndUpdate(
      {
        _id: params.data.idPaciente,
        idNutricionista,
        "planosAlimentares._id": params.data.idPlano,
      },
      {
        $set: camposAtualizados,
        $unset: {
          "planosAlimentares.$.tituloPlano": "",
          "planosAlimentares.$.objetivoDoPlano": "",
          "planosAlimentares.$.observacoesGerais": "",
          "planosAlimentares.$.refeicoes": "",
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!pacienteAtualizado) {
      nextPlanoAlimentarNaoEncontrado(next);
      return;
    }

    const planosAlimentaresAtualizados =
      pacienteAtualizado.planosAlimentares ?? [];
    const indicePlanoAtualizado = buscarIndicePlanoAlimentar(
      planosAlimentaresAtualizados,
      params.data.idPlano,
    );

    if (indicePlanoAtualizado === -1) {
      nextPlanoAlimentarNaoEncontrado(next);
      return;
    }

    return IRetornoPlanoAlimentarSchema.parse({
      message: "Plano alimentar atualizado com sucesso",
      error: false,
      statusCode: 200,
      planoAlimentar: normalizarPlanoAlimentar(
        planosAlimentaresAtualizados[indicePlanoAtualizado],
      ),
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
