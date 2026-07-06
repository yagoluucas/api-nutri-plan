import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express";
import { isValidString } from "../utils/utils.js";
import Nutricionista from "../database/nutricionista.js";
import { ITokenPayloadSchema } from "../interfaces/auth/authInterfaces.js";
import { INutricionistaSchema } from "../interfaces/usuarios/nutricionistaInterfaces.js";
import { conectarAoBancoDeDados } from "../database/conexaoAoBanco.js";
import { IErrorCause } from "../interfaces/errors/erros.js";

const AUTH_COOKIE_NAMES = ["accessToken", "__Host-accessToken", "nutriplan_token"];

function getBearerToken(req: Request) {
    const authHeader = req.headers?.authorization;

    if (isValidString(authHeader)) {
        const [bearer, token] = authHeader.split(" ");

        if (isValidString(bearer) && bearer === "Bearer" && isValidString(token)) {
            return token;
        }
    }

    for (const cookieName of AUTH_COOKIE_NAMES) {
        const token = req.cookies?.[cookieName];

        if (isValidString(token)) {
            return token;
        }
    }

    return null;
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = getBearerToken(req);

        if (!isValidString(token)) {
            next(new Error("Não autorizado", {cause: {cause: "Authentication Failed", statusCode: 401} as IErrorCause}));
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!isValidString(jwtSecret)) {
            next(new Error("Erro interno do servidor", {cause: {cause: "Internal Server Error", statusCode: 500} as IErrorCause}));
            return;
        }

        let decoded;

        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (error) {
            next(new Error("Não autorizado", {cause: {cause: "Authentication Failed", statusCode: 401} as IErrorCause}));
            return;
        }

        const parsedToken = ITokenPayloadSchema.safeParse(decoded);

        if (!parsedToken.success) {
            next(new Error("Não autorizado", {cause: {cause: "Authentication Failed", statusCode: 401} as IErrorCause}));
            return;
        }

        const id = parsedToken.data?.id;

        await conectarAoBancoDeDados();

        const parsedUser = INutricionistaSchema.partial().safeParse(await Nutricionista.findById(id));

        if (!parsedUser.success) {
            next(new Error("Não autorizado", {cause: {cause: "Authentication Failed", statusCode: 401} as IErrorCause}));
            return;
        }

        req.user = parsedUser.data;
        req.nutricionistaId = id;
        next();


    } catch (error) {
        console.log(`[AuthMiddleware] - Error: ${error}`);
        next(error);
    }
}

export { authMiddleware };
