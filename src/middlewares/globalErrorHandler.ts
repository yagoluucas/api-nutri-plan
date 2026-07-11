import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { IErrorCauseSchema } from "../interfaces/errors/erros.js";
import { logger } from "../utils/logger.js";

function getSafeRequestContext(req: Request) {
    return {
        method: req.method,
        path: req.path,
        requestId: req.get("x-request-id") ?? undefined,
        ip: req.ip,
    };
}

function globalErrorHandle(error: unknown, req: Request, res: Response, _next: NextFunction){
    const requestContext = getSafeRequestContext(req);

    if(error instanceof mongoose.Error.ValidationError) {
        const firstError = Object.keys(error.errors)[0];
        const message = error.errors[firstError]?.message || "Erro ao validar dados";

        logger.warn("request_validation_failed", {
            ...requestContext,
            errorType: "mongoose_validation",
            field: firstError,
        });

        return res.status(400).json({
            message,
            cause: "Validation Error",
            error: true,
            statusCode: 400
        })
    }

    if(error instanceof ZodError){
        const err = error.issues[0];

        logger.warn("request_validation_failed", {
            ...requestContext,
            errorType: "zod_validation",
            code: err?.code,
            path: err?.path,
        });

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
            const metadata = {
                ...requestContext,
                statusCode: cause.data.statusCode,
                cause: cause.data.cause,
                internalCause: cause.data.internalCause,
            };

            if (cause.data.statusCode >= 500) {
                logger.error("request_failed", error, metadata);
            } else {
                logger.warn("request_failed", {
                    ...metadata,
                    errorName: error.name,
                    errorMessage: error.message,
                });
            }

            return res.status(cause.data.statusCode).json({
                message: error.message,
                cause: cause.data.cause,
                error: true,
                statusCode: cause.data.statusCode,
            })
        }
    }

    logger.error("unhandled_request_error", error, {
        ...requestContext,
        statusCode: 500,
    });

    return res.status(500).json({
        message: "Error interno do servidor",
        error: true,
        statusCode: 500,
        ...(process.env.NODE_ENV === "production"
            ? {}
            : { details: error instanceof Error ? error.message : String(error) }),
    })
}

export { globalErrorHandle }
