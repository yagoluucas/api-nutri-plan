import { NextFunction, Request, Router } from "express";
import Paciente from "../../database/paciente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  IBuscarPacienteParamsSchema,
  IRetornoPacienteSchema,
  IRetornoPacientesSchema,
} from "../../interfaces/usuarios/pacienteInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { formatDateOnly } from "../../utils/utils.js";

function getIdNutricionistaAutenticado(req: Request, next: NextFunction) {
  const idNutricionista = req.nutricionistaId;

  if (!idNutricionista) {
    next(
      new Error("Nao autorizado", {
        cause: {
          cause: "Authentication Failed",
          statusCode: 401,
        } as IErrorCause,
      }),
    );
    return;
  }

  return idNutricionista;
}

async function buscarPacientes(req: Request, next: NextFunction) {
  try {
    await conectarAoBancoDeDados();

    const idNutricionista = getIdNutricionistaAutenticado(req, next);

    if (!idNutricionista) {
      return;
    }

    const pacientesRecuperados = await Paciente.find({
      idNutricionista,
    }).sort({ nome: 1, sobrenome: 1, createdAt: -1 });

    return IRetornoPacientesSchema.parse({
      message: "Pacientes recuperados com sucesso",
      error: false,
      statusCode: 200,
      pacientes: pacientesRecuperados.map((paciente) => ({
        id: String(paciente._id),
        nome: paciente.nome,
        sobrenome: paciente.sobrenome,
        email: paciente.getEmailDescriptografado(),
        sexo: paciente.sexo,
        createdAt: paciente.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: paciente.updatedAt?.toISOString() ?? new Date().toISOString(),
        qtdPlanos: paciente.planosAlimentares?.length ?? 0
      })),
    });
  } catch (error) {
    console.log(`[Recuperar Pacientes] - Error: ${error}`);
    next(error);
  }
}

async function buscarPaciente(
  req: Request,
  next: NextFunction,
) {
  const pacienteParams = IBuscarPacienteParamsSchema.safeParse(req.params);

  if (!pacienteParams.success) {
    next(pacienteParams.error);
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

    const dataNascimento =
      pacienteRecuperado.getDataNascimentoDescriptografada();

    return IRetornoPacienteSchema.parse({
      message: "Paciente recuperado com sucesso",
      error: false,
      statusCode: 200,
      paciente: {
        id: String(pacienteRecuperado._id),
        idNutricionista: pacienteRecuperado.idNutricionista,
        nome: pacienteRecuperado.nome,
        sobrenome: pacienteRecuperado.sobrenome,
        email: pacienteRecuperado.getEmailDescriptografado(),
        dataNascimento: formatDateOnly(dataNascimento),
        sexo: pacienteRecuperado.sexo,
        observacoes: pacienteRecuperado.observacoes,
        planosAlimentares: pacienteRecuperado.planosAlimentares ?? [],
        createdAt:
          pacienteRecuperado.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt:
          pacienteRecuperado.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.log(`[Recuperar Paciente] - Error: ${error}`);
    next(error);
  }
}

const buscarPacienteRouter = Router();

buscarPacienteRouter.get("/", authMiddleware, async (req, res, next) => {
  const result = await buscarPacientes(req, next);

  if (result) {
    return res.status(result.statusCode).json(result);
  }
});

buscarPacienteRouter.get(
  "/:idPaciente",
  authMiddleware,
  async (req, res, next) => {
    const result = await buscarPaciente(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { buscarPacienteRouter };
