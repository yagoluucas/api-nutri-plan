import { NextFunction, Request, Response, Router } from "express";
import Paciente from "../../database/paciente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  ICadastrarPacienteRequestSchema,
  IRetornoPacienteSchema,
} from "../../interfaces/usuarios/pacienteInterfaces.js";
import { formatDateOnly } from "../../utils/utils.js";
import { getIdNutricionistaAutenticado } from "./pacienteHelpers.js";

async function cadastrarPaciente(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const pacienteSafe = ICadastrarPacienteRequestSchema.safeParse(req.body);

  if (!pacienteSafe.success) {
    next(pacienteSafe.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();

    const pacienteInput = pacienteSafe.data.paciente;
    const idNutricionista = getIdNutricionistaAutenticado(req, next);

    if (!idNutricionista) {
      return;
    }

    const pacienteCriado = await Paciente.create({
      ...pacienteInput,
      idNutricionista,
      dataNascimento: pacienteInput.dataNascimento?.toISOString(),
      primeiroPlanoEntregue: false,
    });
    const dataNascimento = pacienteCriado.getDataNascimentoDescriptografada();

    return IRetornoPacienteSchema.parse({
      message: "Paciente cadastrado com sucesso",
      error: false,
      statusCode: 201,
      paciente: {
        id: String(pacienteCriado._id),
        idNutricionista: pacienteCriado.idNutricionista,
        nome: pacienteCriado.getNomeDescriptografado(),
        sobrenome: pacienteCriado.getSobrenomeDescriptografado(),
        email: pacienteCriado.getEmailDescriptografado(),
        dataNascimento: formatDateOnly(dataNascimento),
        dataEntregaPrimeiroPlano: formatDateOnly(
          pacienteCriado.dataEntregaPrimeiroPlano,
        ),
        primeiroPlanoEntregue: pacienteCriado.primeiroPlanoEntregue ?? false,
        sexo: pacienteCriado.getSexoDescriptografado(),
        observacoes: pacienteCriado.getObservacoesDescriptografadas(),
        qtdPlanos: pacienteCriado.qtdPlanos,
        createdAt:
          pacienteCriado.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt:
          pacienteCriado.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

const cadastrarPacienteRouter = Router();

cadastrarPacienteRouter.post("/", authMiddleware, async (req, res, next) => {
  const result = await cadastrarPaciente(req, res, next);

  if (result) {
    return res.status(result.statusCode).json(result);
  }
});

export { cadastrarPacienteRouter };
