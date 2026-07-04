import { NextFunction, Request, Response, Router } from "express";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco";
import { getIdNutricionistaAutenticado } from "./nutricionistaHelpers";
import Nutricionista from "../../database/nutricionista";
import { IErrorCause } from "../../interfaces/errors/erros";
import { IRetornoApiSchema } from "../../interfaces/generalInterfaces";
import { authMiddleware } from "../../middlewares/auth";

async function deletarNutricionista(req: Request, next: NextFunction) {

    try {
        await conectarAoBancoDeDados();

        const idNutricionista = getIdNutricionistaAutenticado(req, next);

        if(!idNutricionista){
            return;
        }

        const nutricionistaDeletado = await Nutricionista.findOneAndDelete({
            _id: idNutricionista
        });

        if(!nutricionistaDeletado){
            new Error("Nutricionista não encontrado", {
                cause: {
                    cause: "Not Found",
                    internalCause: "Data Not Found",
                    statusCode: 404
                } as IErrorCause
                
            })

            return;
        }

        return IRetornoApiSchema.parse({
            message: "Perfil excluído com sucesso",
            error: false,
            statusCode: 200
        })


    }catch(error) {
        console.log(`[Deletar Nutricionista] - Error: ${error}`);
        next(error);
    }
}

const deletarNutricionistaRouter = Router();

deletarNutricionistaRouter.delete(
    "/", 
    authMiddleware,
    async(req, res, next) => {
        const result = await deletarNutricionista(req, next);

        if(result) {
            return res.status(result.statusCode).json(result);
        }
    }
)

export {deletarNutricionistaRouter}