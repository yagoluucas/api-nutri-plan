import { NextFunction } from "express";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  IPlanoAlimentar,
  IPlanoAlimentarSchema,
  IPlanoAlimentarRetornoSchema,
} from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";

type PlanoAlimentarDocumento = IPlanoAlimentar & {
  _id?: { toString(): string };
  toObject?: () => IPlanoAlimentar & { _id?: { toString(): string } };
};

function normalizarPlanoAlimentar(planoAlimentar: IPlanoAlimentar) {
  const planoDocumento = planoAlimentar as PlanoAlimentarDocumento;
  const plano =
    typeof planoDocumento.toObject === "function"
      ? planoDocumento.toObject()
      : planoDocumento;

  return IPlanoAlimentarRetornoSchema.parse({
    id: plano._id?.toString(),
    objetivoDoPlano: plano.objetivoDoPlano,
    observacoesGerais: plano.observacoesGerais,
    refeicoes: plano.refeicoes,
  });
}

function buscarIndicePlanoAlimentar(
  planosAlimentares: IPlanoAlimentar[],
  idPlano: string,
) {
  return planosAlimentares.findIndex((planoAlimentar) => {
    const plano = planoAlimentar as PlanoAlimentarDocumento;
    return plano._id?.toString() === idPlano;
  });
}

function isPlanoAlimentarValido(planoAlimentar: IPlanoAlimentar) {
  return IPlanoAlimentarSchema.safeParse(planoAlimentar).success;
}

function nextPlanoAlimentarNaoEncontrado(next: NextFunction) {
  next(
    new Error("Plano alimentar nao encontrado", {
      cause: {
        cause: "Not Found",
        internalCause: "Data Not Found",
        statusCode: 404,
      } as IErrorCause,
    }),
  );
}

export {
  buscarIndicePlanoAlimentar,
  isPlanoAlimentarValido,
  nextPlanoAlimentarNaoEncontrado,
  normalizarPlanoAlimentar,
};
