import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import {
  IAtualizarNutricionista,
  IRetornoPerfilNutricionistaSchema,
} from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarNutricionistaAutenticado,
  existeConflitoIdentidadeNutricionista,
  getIdNutricionistaAutenticado,
  normalizarPerfilNutricionista,
} from "./nutricionistaHelpers.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { logger } from "../../utils/logger.js";
import {
  MAX_COVER_IMAGE_SIZE,
  MAX_PROFILE_IMAGE_SIZE,
  parseNutricionistaImageUpload,
} from "./nutricionistaImagemMiddleware.js";
import { enviarImagemNutricionista } from "./nutricionistaImagemService.js";

type CampoImagemNutricionista = "imagemPerfil" | "imagemCapa";

type ArquivosImagemNutricionista = Partial<
  Record<CampoImagemNutricionista, Express.Multer.File[]>
>;

const MIME_TYPES_IMAGEM = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function obterMimeTypeReal(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return undefined;
}

function erroValidacaoImagem(message: string) {
  return new Error(message, {
    cause: {
      cause: "Validation Error",
      statusCode: 400,
    } as IErrorCause,
  });
}

function validarArquivoImagem(
  file: Express.Multer.File | undefined,
  maxSize: number,
  campo: CampoImagemNutricionista,
) {
  if (!file) {
    return;
  }

  const nomeCampo = campo === "imagemPerfil" ? "perfil" : "capa";
  const limite = campo === "imagemPerfil" ? "1 MB" : "2 MB";

  if (file.size === 0) {
    throw erroValidacaoImagem(`A imagem de ${nomeCampo} esta vazia.`);
  }

  if (file.size > maxSize) {
    throw erroValidacaoImagem(
      `A imagem de ${nomeCampo} deve ter no maximo ${limite}.`,
    );
  }

  if (!MIME_TYPES_IMAGEM.has(file.mimetype)) {
    throw erroValidacaoImagem(
      `A imagem de ${nomeCampo} deve ser PNG, JPG, JPEG ou WEBP.`,
    );
  }

  const mimeTypeReal = obterMimeTypeReal(file.buffer);

  if (mimeTypeReal !== file.mimetype) {
    throw erroValidacaoImagem(
      `O arquivo enviado para imagem de ${nomeCampo} nao e uma imagem valida.`,
    );
  }
}

function prepararBodyAtualizacao(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return body;
  }

  const bodyNormalizado = { ...(body as Record<string, unknown>) };
  const alimentosFavoritos = bodyNormalizado.alimentosFavoritos;

  if (typeof alimentosFavoritos === "string") {
    try {
      bodyNormalizado.alimentosFavoritos = JSON.parse(alimentosFavoritos);
    } catch {
      return body;
    }
  }

  return bodyNormalizado;
}

function obterArquivoImagem(
  req: Request,
  campo: CampoImagemNutricionista,
) {
  const arquivos = req.files as ArquivosImagemNutricionista | undefined;
  return arquivos?.[campo]?.[0];
}

function conflitoNutricionistaError() {
  return new Error("Ja existe um nutricionista cadastrado com estes dados", {
    cause: {
      cause: "Conflict",
      statusCode: 422,
    } as IErrorCause,
  });
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

async function atualizarNutricionista(req: Request, next: NextFunction) {
  const nutricionistaSafe = IAtualizarNutricionista.safeParse(
    prepararBodyAtualizacao(req.body),
  );

  if (!nutricionistaSafe.success) {
    next(nutricionistaSafe.error);
    return;
  }

  try {
    await conectarAoBancoDeDados();

    const idNutricionista = getIdNutricionistaAutenticado(req, next);

    if (!idNutricionista) {
      return;
    }

    const nutricionista = await buscarNutricionistaAutenticado(
      idNutricionista,
      next,
    );

    if (!nutricionista) {
      return;
    }

    const nutricionistaData = nutricionistaSafe.data;
    const imagemPerfil = obterArquivoImagem(req, "imagemPerfil");
    const imagemCapa = obterArquivoImagem(req, "imagemCapa");

    validarArquivoImagem(
      imagemPerfil,
      MAX_PROFILE_IMAGE_SIZE,
      "imagemPerfil",
    );
    validarArquivoImagem(imagemCapa, MAX_COVER_IMAGE_SIZE, "imagemCapa");

    if (nutricionistaData.email || nutricionistaData.crn) {
      const existeConflito = await existeConflitoIdentidadeNutricionista({
        email:
          nutricionistaData.email ?? nutricionista.getEmailDescriptografado(),
        crn: nutricionistaData.crn ?? nutricionista.getCrnDescriptografado(),
        ignorarIdNutricionista: idNutricionista,
      });

      if (existeConflito) {
        next(conflitoNutricionistaError());
        return;
      }
    }

    Object.entries(nutricionistaData).forEach(([campo, valor]) => {
      if (valor !== undefined) {
        nutricionista.set(campo, valor);
      }
    });

    if (imagemPerfil) {
      const imagemPerfilUpload = await enviarImagemNutricionista({
        buffer: imagemPerfil.buffer,
        tipo: "perfil",
        idNutricionista,
      });

      nutricionista.set("imagemPerfil", imagemPerfilUpload.url);
    }

    if (imagemCapa) {
      const imagemCapaUpload = await enviarImagemNutricionista({
        buffer: imagemCapa.buffer,
        tipo: "capa",
        idNutricionista,
      });

      nutricionista.set("imagemCapa", imagemCapaUpload.url);
    }

    await nutricionista.save({ validateModifiedOnly: true });

    return IRetornoPerfilNutricionistaSchema.parse({
      message: "Perfil do nutricionista atualizado",
      error: false,
      statusCode: 200,
      nutricionista: normalizarPerfilNutricionista(nutricionista),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      next(conflitoNutricionistaError());
      return;
    }

    logger.error("nutritionist_profile_update_failed", error);
    next(error);
  }
}

const atualizarPerfilNutricionistaRouter = Router();

atualizarPerfilNutricionistaRouter.patch(
  "/",
  authMiddleware,
  parseNutricionistaImageUpload,
  async (req, res, next) => {
    const result = await atualizarNutricionista(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { atualizarPerfilNutricionistaRouter };
