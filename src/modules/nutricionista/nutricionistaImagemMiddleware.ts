import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { IErrorCause } from "../../interfaces/errors/erros.js";

const MAX_PROFILE_IMAGE_SIZE = 1 * 1024 * 1024;
const MAX_COVER_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_MULTIPART_FILE_SIZE = MAX_COVER_IMAGE_SIZE;

const nutricionistaImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 2,
    fileSize: MAX_MULTIPART_FILE_SIZE,
    fields: 6,
    fieldNameSize: 40,
    fieldSize: 64 * 1024,
    // O Busboy conta o boundary final: 6 campos + 2 arquivos + 1.
    parts: 9,
  },
}).fields([
  { name: "imagemPerfil", maxCount: 1 },
  { name: "imagemCapa", maxCount: 1 },
]);

function erroUploadImagem(message: string) {
  return new Error(message, {
    cause: {
      cause: "Validation Error",
      statusCode: 400,
    } as IErrorCause,
  });
}

function getMensagemLimiteArquivo(field?: string) {
  if (field === "imagemPerfil") {
    return "A imagem de perfil deve ter no maximo 1 MB.";
  }

  if (field === "imagemCapa") {
    return "A imagem de capa deve ter no maximo 2 MB.";
  }

  return "As imagens devem respeitar os limites: perfil ate 1 MB e capa ate 2 MB.";
}

function parseNutricionistaImageUpload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  nutricionistaImageUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? getMensagemLimiteArquivo(error.field)
          : "Dados de imagem invalidos.";

      next(erroUploadImagem(message));
      return;
    }

    next(erroUploadImagem("Dados de imagem invalidos."));
  });
}

export {
  MAX_PROFILE_IMAGE_SIZE,
  MAX_COVER_IMAGE_SIZE,
  parseNutricionistaImageUpload,
};
