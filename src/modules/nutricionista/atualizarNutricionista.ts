import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import {
  IAtualizarNutricionista,
  IRetornoPerfilNutricionistaSchema,
} from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarNutricionistaAutenticado,
  getIdNutricionistaAutenticado,
  normalizarPerfilNutricionista,
} from "./nutricionistaHelpers.js";

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
    console.log(`[Atualizar perfil do nutricionista] - Error: ${error}`);
    next(error);
  }
}

const atualizarImagemPerfilNutricionistaRouter = Router();

atualizarImagemPerfilNutricionistaRouter.patch(
  "/",
  authMiddleware,
  async (req, res, next) => {
    const result = await atualizarNutricionista(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { atualizarImagemPerfilNutricionistaRouter };
