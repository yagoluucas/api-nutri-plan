import { NextFunction } from "express";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  IPlanoAlimentar,
  IPlanoAlimentarPersistido,
  IPlanoAlimentarSchema,
  IPlanoAlimentarRetornoSchema,
} from "../../interfaces/planoAlimentar/planoAlimentarInterfaces.js";
import {
  decryptJson,
  encryptJson,
  PATIENT_DIET_PLAN_CONTEXT,
} from "../../utils/encryption.js";

type PlanoAlimentarDocumento = IPlanoAlimentarPersistido & {
  _id?: { toString(): string };
  toObject?: () => IPlanoAlimentarPersistido & {
    _id?: { toString(): string };
  };
};

function getPlanoDocumento(planoAlimentar: unknown) {
  const planoDocumento = planoAlimentar as PlanoAlimentarDocumento;

  return typeof planoDocumento?.toObject === "function"
    ? planoDocumento.toObject()
    : planoDocumento;
}

function descriptografarPlanoAlimentar(
  planoAlimentar: unknown,
): IPlanoAlimentar {
  const plano = getPlanoDocumento(planoAlimentar);

  if (typeof plano?.conteudoProtegido === "string") {
    return IPlanoAlimentarSchema.parse(
      decryptJson<unknown>(
        plano.conteudoProtegido,
        PATIENT_DIET_PLAN_CONTEXT,
      ),
    );
  }

  return IPlanoAlimentarSchema.parse({
    objetivoDoPlano: plano?.objetivoDoPlano,
    observacoesGerais: plano?.observacoesGerais,
    refeicoes: plano?.refeicoes,
  });
}

function protegerPlanoAlimentar(planoAlimentar: IPlanoAlimentar) {
  const planoValidado = IPlanoAlimentarSchema.parse(planoAlimentar);

  return {
    conteudoProtegido: encryptJson(
      planoValidado,
      PATIENT_DIET_PLAN_CONTEXT,
    ),
  };
}

function normalizarPlanoAlimentar(planoAlimentar: unknown) {
  const plano = getPlanoDocumento(planoAlimentar);
  const planoDescriptografado = descriptografarPlanoAlimentar(plano);

  return IPlanoAlimentarRetornoSchema.parse({
    id: plano?._id?.toString(),
    ...planoDescriptografado,
  });
}

function buscarIndicePlanoAlimentar(
  planosAlimentares: unknown[],
  idPlano: string,
) {
  return planosAlimentares.findIndex((planoAlimentar) => {
    const plano = getPlanoDocumento(planoAlimentar);
    return plano?._id?.toString() === idPlano;
  });
}

function isPlanoAlimentarValido(planoAlimentar: unknown) {
  try {
    descriptografarPlanoAlimentar(planoAlimentar);
    return true;
  } catch {
    return false;
  }
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
  descriptografarPlanoAlimentar,
  isPlanoAlimentarValido,
  nextPlanoAlimentarNaoEncontrado,
  normalizarPlanoAlimentar,
  protegerPlanoAlimentar,
};
