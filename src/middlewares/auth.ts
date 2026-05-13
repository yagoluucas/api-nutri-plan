import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express";
import { isValidString } from "../utils/utils.js";
import Nutricionista from "../database/nutricionista.js";
import { ITokenPayloadSchema } from "../interfaces/auth/authInterfaces.js";
import { INutricionistaSchema } from "../interfaces/usuarios/nutricionistaInterfaces.js";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void
> {
    try {
        const authHeader = req.headers?.authorization;

        if (!authHeader || !isValidString(authHeader)) {
            res.status(401).json({
                message: "Token não fornecido",
                error: true,
            });

            return;
        }

        const [bearer, token] = authHeader.split(" ");

        if (!isValidString(bearer) || bearer !== "Bearer" || !isValidString(token)) {
            res.status(401).json({
                message: "Token inválido",
                error: true,
            });

            return;
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!isValidString(jwtSecret)) {
            res.status(500).json({
                message: "Chave secreta não configurada",
                error: true,
            });

            return;
        }

        const decoded = jwt.verify(token, jwtSecret);

        const parsedToken = ITokenPayloadSchema.safeParse(decoded);

        if(!parsedToken.success) {
            res.status(401).json({
                message: "Token inválido",
                error: true
            })

            return;
        }

        const id = parsedToken.data?.id;

        const parsedUser = INutricionistaSchema.partial().safeParse(await Nutricionista.findById(id));

        if (!parsedUser.success) {
            res.status(404).json({
                message: "Usuário do token não existe mais",
                error: true,
            });

            return;
        }

        req.user = parsedUser.data;
        next();


    } catch (error) {
        console.log(`[AuthMiddleware] - Error: ${error}`);
        
        res.status(500).json({
            message: "Erro ao validar token",
            error: true,
        });
    }
}

export {authMiddleware};