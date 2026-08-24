import { NextFunction, Request, Router } from "express";
import Paciente from "../../database/paciente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { IIdPacienteParamsSchema } from "../../interfaces/generalInterfaces.js";
import {
  IAtualizarPacienteInputSchema,
  IAtualizarPacienteRequestSchema,
  IRetornoPacienteSchema,
} from "../../interfaces/usuarios/pacienteInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { formatDateOnly } from "../../utils/utils.js";
import { getIdNutricionistaAutenticado } from "./pacienteHelpers.js";

async function atualizarPaciente(req: Request, next: NextFunction) {
  const pacienteParams = IIdPacienteParamsSchema.safeParse(req.params);

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
    const camposPermitidos = new Set(
      Object.keys(IAtualizarPacienteInputSchema.shape),
    );

    for (const [campo, valor] of Object.entries(pacienteAtualizacao)) {
      if (!camposPermitidos.has(campo)) {
        continue;
      }

      pacienteRecuperado.set(
        campo,
        campo === "dataNascimento" && valor instanceof Date
          ? valor.toISOString()
          : valor,
      );
    }

    await pacienteRecuperado.save({ validateModifiedOnly: true });

    const dataNascimento =
      pacienteRecuperado.getDataNascimentoDescriptografada();

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
        dataEntregaPrimeiroPlano: formatDateOnly(
          pacienteRecuperado.dataEntregaPrimeiroPlano,
        ),
        primeiroPlanoEntregue:
          pacienteRecuperado.primeiroPlanoEntregue ?? false,
        sexo: pacienteRecuperado.getSexoDescriptografado(),
        observacoes: pacienteRecuperado.getObservacoesDescriptografadas(),
        qtdPlanos: pacienteRecuperado.qtdPlanos,
        createdAt:
          pacienteRecuperado.createdAt?.toISOString() ??
          new Date().toISOString(),
        updatedAt:
          pacienteRecuperado.updatedAt?.toISOString() ??
          new Date().toISOString(),
      },
    });
  } catch (error) {
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
