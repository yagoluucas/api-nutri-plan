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
  const nutricionistaSafe = IAtualizarNutricionista.safeParse(req.body);

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
  async (req, res, next) => {
    const result = await atualizarNutricionista(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { atualizarPerfilNutricionistaRouter };
