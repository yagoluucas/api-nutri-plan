import { NextFunction, Request, Router } from "express";
import Paciente from "../../database/paciente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  IAtualizarPacienteRequestSchema,
  IBuscarUsuarioParamsSchema,
  IRetornoPacienteSchema,
} from "../../interfaces/usuarios/pacienteInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  isPlanoAlimentarValido,
  normalizarPlanoAlimentar,
} from "../planoAlimentar/planoAlimentarHelpers.js";
import { formatDateOnly } from "../../utils/utils.js";
import { getIdNutricionistaAutenticado } from "./pacienteHelpers.js";

async function atualizarPaciente(req: Request, next: NextFunction) {
  const pacienteParams = IBuscarUsuarioParamsSchema.safeParse(req.params);

  if (!pacienteParams.success) {
    next(pacienteParams.error);
    return;
  }

  const pacienteSafe = IAtualizarPacienteRequestSchema.safeParse(req.body);

  if (!pacienteSafe.success) {
    next(pacienteSafe.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();

    const idNutricionista = getIdNutricionistaAutenticado(req, next);

    if (!idNutricionista) {
      return;
    }

    const pacienteRecuperado = await Paciente.findOne({
      _id: pacienteParams.data.idPaciente,
      idNutricionista,
    });

    if (!pacienteRecuperado) {
      next(
        new Error("Paciente nao encontrado", {
          cause: {
            cause: "Not Found",
            internalCause: "Data Not Found",
            statusCode: 404,
          } as IErrorCause,
        }),
      );
      return;
    }

    const pacienteAtualizacao = pacienteSafe.data.paciente;

    if (pacienteAtualizacao.nome !== undefined) {
      pacienteRecuperado.nome = pacienteAtualizacao.nome;
    }

    if (pacienteAtualizacao.sobrenome !== undefined) {
      pacienteRecuperado.sobrenome = pacienteAtualizacao.sobrenome;
    }

    if (pacienteAtualizacao.sexo !== undefined) {
      pacienteRecuperado.sexo = pacienteAtualizacao.sexo;
    }

    if (Object.hasOwn(pacienteAtualizacao, "email")) {
      pacienteRecuperado.email = pacienteAtualizacao.email;
    }

    if (Object.hasOwn(pacienteAtualizacao, "dataNascimento")) {
      pacienteRecuperado.dataNascimento =
        pacienteAtualizacao.dataNascimento?.toISOString();
    }

    if (Object.hasOwn(pacienteAtualizacao, "observacoes")) {
      pacienteRecuperado.observacoes = pacienteAtualizacao.observacoes;
    }

    await pacienteRecuperado.save({ validateModifiedOnly: true });

    const dataNascimento =
      pacienteRecuperado.getDataNascimentoDescriptografada();
    const planosAlimentares = (pacienteRecuperado.planosAlimentares ?? [])
      .filter(isPlanoAlimentarValido)
      .map(normalizarPlanoAlimentar);

    return IRetornoPacienteSchema.parse({
      message: "Paciente atualizado com sucesso",
      error: false,
      statusCode: 200,
      paciente: {
        id: String(pacienteRecuperado._id),
        idNutricionista: pacienteRecuperado.idNutricionista,
        nome: pacienteRecuperado.getNomeDescriptografado(),
        sobrenome: pacienteRecuperado.getSobrenomeDescriptografado(),
        email: pacienteRecuperado.getEmailDescriptografado(),
        dataNascimento: formatDateOnly(dataNascimento),
        sexo: pacienteRecuperado.getSexoDescriptografado(),
        observacoes: pacienteRecuperado.getObservacoesDescriptografadas(),
        planosAlimentares,
        createdAt:
          pacienteRecuperado.createdAt?.toISOString() ??
          new Date().toISOString(),
        updatedAt:
          pacienteRecuperado.updatedAt?.toISOString() ??
          new Date().toISOString(),
      },
    });
  } catch (error) {
    console.log(`[Atualizar Paciente] - Error: ${error}`);
    next(error);
  }
}

const atualizarPacienteRouter = Router();

atualizarPacienteRouter.patch(
  "/:idPaciente",
  authMiddleware,
  async (req, res, next) => {
    const result = await atualizarPaciente(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { atualizarPacienteRouter };
