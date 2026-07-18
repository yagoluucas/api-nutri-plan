import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IRetornoPerfilNutricionistaSchema } from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { logger } from "../../utils/logger.js";
import {
  buscarNutricionistaAutenticado,
  getIdNutricionistaAutenticado,
  normalizarPerfilNutricionista,
} from "./nutricionistaHelpers.js";

async function buscarPerfilNutricionista(req: Request, next: NextFunction) {
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

    return IRetornoPerfilNutricionistaSchema.parse({
      message: "Perfil recuperado com sucesso",
      error: false,
      statusCode: 200,
      nutricionista: normalizarPerfilNutricionista(nutricionista),
    });
  } catch (error) {
    logger.error("nutritionist_profile_fetch_failed", error);
    next(error);
  }
}

const buscarPerfilNutricionistaRouter = Router();

buscarPerfilNutricionistaRouter.get(
  "/perfil",
  authMiddleware,
  async (req, res, next) => {
    const result = await buscarPerfilNutricionista(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { buscarPerfilNutricionistaRouter };
