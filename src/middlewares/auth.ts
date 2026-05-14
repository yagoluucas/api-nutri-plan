import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express";
import { isValidString } from "../utils/utils.js";
import Nutricionista from "../database/nutricionista.js";
import { ITokenPayloadSchema } from "../interfaces/auth/authInterfaces.js";
import { INutricionistaSchema } from "../interfaces/usuarios/nutricionistaInterfaces.js";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";

function unauthorized(res: Response): void {
    res.status(401).json({
        message: "Não autorizado",
        error: true,
    });
}

function internalServerError(res: Response): void {
    res.status(500).json({
        message: "Erro interno do servidor",
        error: true,
    });
}

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void
> {
    try {
        const authHeader = req.headers?.authorization;

        if (!authHeader || !isValidString(authHeader)) {
            unauthorized(res);
            return;
        }

        const [bearer, token] = authHeader.split(" ");

        if (!isValidString(bearer) || bearer !== "Bearer" || !isValidString(token)) {
            unauthorized(res);
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!isValidString(jwtSecret)) {
            internalServerError(res);
            return;
        }

        let decoded;

        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (error) {
            unauthorized(res);
            return;
        }

        const parsedToken = ITokenPayloadSchema.safeParse(decoded);

        if (!parsedToken.success) {
            unauthorized(res);
            return;
        }

        const id = parsedToken.data?.id;

        await conectarAoBancoDeDados();

        const parsedUser = INutricionistaSchema.partial().safeParse(await Nutricionista.findById(id));

        if (!parsedUser.success) {
            unauthorized(res);
            return;
        }

        req.user = parsedUser.data;
        next();


    } catch (error) {
        console.log(`[AuthMiddleware] - Error: ${error}`);
        internalServerError(res);
    }
}

export { authMiddleware };