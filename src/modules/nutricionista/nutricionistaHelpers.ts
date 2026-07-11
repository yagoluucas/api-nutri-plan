import { NextFunction, Request } from "express";
import Nutricionista from "../../database/nutricionista.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { IPerfilNutricionistaSchema } from "../../interfaces/usuarios/nutricionistaInterfaces.js";

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

async function buscarNutricionistaAutenticado(
  idNutricionista: string,
  next: NextFunction,
) {
  const nutricionista = await Nutricionista.findById(idNutricionista);

  if (!nutricionista) {
    next(
      new Error("Nutricionista nao encontrado", {
        cause: {
          cause: "Not Found",
          internalCause: "Data Not Found",
          statusCode: 404,
        } as IErrorCause,
      }),
    );
    return;
  }

  return nutricionista;
}

function normalizarPerfilNutricionista(nutricionista: {
  _id: { toString(): string };
  nome: string;
  sobrenome: string;
  email: string;
  dataNascimento: Date;
  crn: string;
  imagemPerfil?: string;
  imagemCapa?: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return IPerfilNutricionistaSchema.parse({
    id: nutricionista._id.toString(),
    nome: nutricionista.nome,
    sobrenome: nutricionista.sobrenome,
    email: nutricionista.email,
    dataNascimento: nutricionista.dataNascimento.toISOString(),
    crn: nutricionista.crn,
    imagemPerfil: nutricionista.imagemPerfil,
    imagemCapa: nutricionista.imagemCapa,
    createdAt: nutricionista.createdAt?.toISOString(),
    updatedAt: nutricionista.updatedAt?.toISOString(),
  });
}

export {
  buscarNutricionistaAutenticado,
  getIdNutricionistaAutenticado,
  normalizarPerfilNutricionista,
};
