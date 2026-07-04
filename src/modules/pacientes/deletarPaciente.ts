import { NextFunction, Request, Router } from "express";
import Paciente from "../../database/paciente.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { IRetornoApiSchema } from "../../interfaces/generalInterfaces.js";
import { IBuscarPacienteParamsSchema } from "../../interfaces/usuarios/pacienteInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";

async function deletarPaciente(req: Request, next: NextFunction) {
  const pacienteParams = IBuscarPacienteParamsSchema.safeParse(req.params);

  if (!pacienteParams.success) {
    next(pacienteParams.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();

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

    const pacienteDeletado = await Paciente.findOneAndDelete({
      _id: pacienteParams.data.idPaciente,
      idNutricionista,
    });

    if (!pacienteDeletado) {
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

    return IRetornoApiSchema.parse({
      message: "Paciente excluido com sucesso",
      error: false,
      statusCode: 200,
    });
  } catch (error) {
    console.log(`[Deletar Paciente] - Error: ${error}`);
    next(error);
  }
}

const deletarPacienteRouter = Router();

deletarPacienteRouter.delete(
  "/:idPaciente",
  authMiddleware,
  async (req, res, next) => {
    const result = await deletarPaciente(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { deletarPacienteRouter };
