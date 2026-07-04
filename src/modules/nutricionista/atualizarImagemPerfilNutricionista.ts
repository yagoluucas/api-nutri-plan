import { NextFunction, Request, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import {
  IAtualizarImagemPerfilNutricionistaRequestSchema,
  IRetornoPerfilNutricionistaSchema,
} from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  buscarNutricionistaAutenticado,
  getIdNutricionistaAutenticado,
  normalizarPerfilNutricionista,
} from "./nutricionistaHelpers.js";

async function atualizarImagemPerfilNutricionista(
  req: Request,
  next: NextFunction,
) {
  const imagemSafe =
    IAtualizarImagemPerfilNutricionistaRequestSchema.safeParse(req.body);

  if (!imagemSafe.success) {
    next(imagemSafe.error);
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

    nutricionista.imagemPerfil = imagemSafe.data.imagemPerfil ?? undefined;
    await nutricionista.save({ validateModifiedOnly: true });

    return IRetornoPerfilNutricionistaSchema.parse({
      message: "Imagem de perfil atualizada com sucesso",
      error: false,
      statusCode: 200,
      nutricionista: normalizarPerfilNutricionista(nutricionista),
    });
  } catch (error) {
    console.log(`[Atualizar Imagem Perfil Nutricionista] - Error: ${error}`);
    next(error);
  }
}

const atualizarImagemPerfilNutricionistaRouter = Router();

atualizarImagemPerfilNutricionistaRouter.patch(
  "/perfil/imagem",
  authMiddleware,
  async (req, res, next) => {
    const result = await atualizarImagemPerfilNutricionista(req, next);

    if (result) {
      return res.status(result.statusCode).json(result);
    }
  },
);

export { atualizarImagemPerfilNutricionistaRouter };
