import { NextFunction, Request } from "express";
import { HydratedDocument } from "mongoose";
import Nutricionista from "../../database/nutricionista.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import {
  INutricionistaDB,
  INutricionistaMethods,
  IPerfilNutricionistaSchema,
} from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import {
  createSearchHash,
  normalizeCrnForSearch,
  normalizeEmailForSearch,
} from "../../utils/searchHash.js";

type NutricionistaDocument = HydratedDocument<
  INutricionistaDB,
  INutricionistaMethods
>;

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

async function existeConflitoIdentidadeNutricionista({
  email,
  crn,
  ignorarIdNutricionista,
}: {
  email: string;
  crn: string;
  ignorarIdNutricionista?: string;
}) {
  const emailNormalizado = normalizeEmailForSearch(email);
  const crnNormalizado = normalizeCrnForSearch(crn);
  const emailHash = createSearchHash(emailNormalizado);
  const crnHash = createSearchHash(crnNormalizado);
  const filtroMesmoNutricionista = ignorarIdNutricionista
    ? { _id: { $ne: ignorarIdNutricionista } }
    : {};

  const nutricionistaComMesmoHash = await Nutricionista.findOne({
    ...filtroMesmoNutricionista,
    $or: [{ emailHash }, { crnHash }],
  });

  if (nutricionistaComMesmoHash) {
    return true;
  }

  const cursorLegado = Nutricionista.find({
    ...filtroMesmoNutricionista,
    $or: [
      { emailHash: { $exists: false } },
      { crnHash: { $exists: false } },
      { emailHash: null },
      { crnHash: null },
    ],
  }).cursor();

  for await (const nutricionistaLegado of cursorLegado) {
    const emailLegado = normalizeEmailForSearch(
      nutricionistaLegado.getEmailDescriptografado(),
    );
    const crnLegado = normalizeCrnForSearch(
      nutricionistaLegado.getCrnDescriptografado(),
    );

    if (emailLegado === emailNormalizado || crnLegado === crnNormalizado) {
      return true;
    }
  }

  return false;
}

function normalizarPerfilNutricionista(nutricionista: NutricionistaDocument) {
  const dataNascimento = nutricionista.getDataNascimentoDescriptografada();

  return IPerfilNutricionistaSchema.parse({
    id: nutricionista._id.toString(),
    nome: nutricionista.getNomeDescriptografado(),
    sobrenome: nutricionista.getSobrenomeDescriptografado(),
    email: nutricionista.getEmailDescriptografado(),
    dataNascimento: dataNascimento?.toISOString(),
    crn: nutricionista.getCrnDescriptografado(),
    imagemPerfil: nutricionista.getImagemPerfilDescriptografada(),
    imagemCapa: nutricionista.getImagemCapaDescriptografada(),
    alimentosFavoritos: nutricionista.alimentosFavoritos ?? [],
    createdAt: nutricionista.createdAt?.toISOString(),
    updatedAt: nutricionista.updatedAt?.toISOString(),
  });
}

export {
  buscarNutricionistaAutenticado,
  existeConflitoIdentidadeNutricionista,
  getIdNutricionistaAutenticado,
  normalizarPerfilNutricionista,
};
