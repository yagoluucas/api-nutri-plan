import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { IErrorCauseSchema } from "../interfaces/errors/erros.js";

// O Express identifica que este é um middleware de ERRO especificamente
// por ele receber 4 parâmetros (error, req, res, next) e não 3 como o auth.
function globalErrorHandle(error: any, req: Request, res: Response, next: NextFunction){
   
    if(error instanceof mongoose.Error.ValidationError) {
        const firstError = Object.keys(error.errors)[0];

        console.log(`[Mongo Error] - Error: ${error}`);

        const message = error.errors[firstError]?.message || "Erro ao validar dados";
        return res.status(400).json({
            message,
            cause: "Validation Error",
            error: true,
            statusCode: 400
        })
    }

    if(error instanceof ZodError){

        console.log(`[Zod Error] - Error: ${error}`);

        const err = error.issues[0];
        return res.status(400).json({
            message: err.message,
            error: true,
            cause: "Validation Error",
            statusCode: 400,
        })
    }

    if(error instanceof Error){
        const cause = IErrorCauseSchema.safeParse(error.cause);

        if(cause.success) {
            return res.status(cause.data.statusCode).json({
                message: error.message,
                cause: cause.data.cause,
                error: true,
                statusCode: cause.data.statusCode,
            })
        }
    }

    return res.status(500).json({
        message: "Error interno do servidor",
        error: true,
        statusCode: 500
    })
}

export { globalErrorHandle }