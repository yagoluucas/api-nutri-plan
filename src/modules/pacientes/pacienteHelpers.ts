import { NextFunction, Request } from "express";
import Paciente from "../../database/paciente.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";

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

async function buscarPacienteAutorizado(
  idPaciente: string,
  idNutricionista: string,
  next: NextFunction,
) {
  const paciente = await Paciente.findOne({
    _id: idPaciente,
    idNutricionista,
  });

  if (!paciente) {
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

  return paciente;
}

export { buscarPacienteAutorizado, getIdNutricionistaAutenticado };
