import Nutricionista from "../../database/nutricionista.js";
import { gerarToken } from "../../utils/utils.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { type AuthResult, ILoginUserSchema } from "../../interfaces/auth/authInterfaces.js";
import { INutricionistaSchema } from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { IErrorCause } from "../../interfaces/errors/erros.js";
import { NextFunction, Request, Response, Router } from "express";

const authRouter = Router();

async function register(req: Request, res: Response, next: NextFunction): Promise<AuthResult | void> {

    const nutricionistSafe = INutricionistaSchema.safeParse(req.body.nutricionista);

    if (!nutricionistSafe.success) {
        next(nutricionistSafe.error);
        return;
    }

    try {

        await conectarAoBancoDeDados();

        const nutricionistExist = await Nutricionista.findOne({ email: nutricionistSafe.data.email });

        if (nutricionistExist) {
            next(new Error("Nutricionista já cadastrado, tente novamente", { cause: {cause: "Conflict", statusCode: 422} as IErrorCause }));
            return;
        }

        const createNutricionist = await Nutricionista.create(nutricionistSafe.data);

        const token = gerarToken(createNutricionist._id.toString());

        return {
            token,
            body: {
                message: "Nutricionista cadastrado com sucesso",
                error: false,
                statusCode: 201,
                user: {
                    id: createNutricionist._id.toString(),
                    nome: createNutricionist.nome,
                    email: createNutricionist.email
                }
            }
        }

    } catch (error) {
        console.log(`[Auth Register] - Error: ${error}`);
        next(error);
    }
}

async function login(req: Request, res: Response, next: NextFunction): Promise<AuthResult | void> {
    const safeUser = ILoginUserSchema.safeParse(req.body?.userLogin);

    if (!safeUser.success) {
        next(safeUser.error);
        return;
    }

    try {
        await conectarAoBancoDeDados();
        const user = await Nutricionista.findOne({ email: safeUser.data.email }).select("+senha");

        if (!user) {
            next(new Error("Email ou senha inválidos, confira os dados e tente novamente", { cause: {cause: "Authentication Failed", statusCode: 401} as IErrorCause }));
            return;
        }

        const isPasswordValid = await user.validarSenha(safeUser.data.senha);

        if (!isPasswordValid) {
            next(new Error("Email ou senha inválidos, confira os dados e tente novamente", { cause: {cause: "Authentication Failed", statusCode: 401} as IErrorCause }));
            return;
        }

        const token = gerarToken(user._id.toString());

        return {
            token,
            body: {
                message: "Login realizado com sucesso",
                error: false,
                statusCode: 200,
                user: {
                    id: user._id.toString(),
                    nome: user.nome,
                    email: user.email
                }
            }
        }

    } catch (error) {
        console.log(`[Auth Login] - Error: ${error}`);
        next(error);
    }
}

authRouter.post("/register", async (req, res, next) => {
    const returnAuth = await register(req, res, next);
    if (returnAuth) {
        res.set("Authorization", `Bearer ${returnAuth.token}`);
        return res.status(returnAuth.body.statusCode).json(returnAuth.body);
    }
});

authRouter.post("/login", async (req, res, next) => {
    const returnAuth = await login(req, res, next);
    if (returnAuth) {
        res.set("Authorization", `Bearer ${returnAuth.token}`);
        return res.status(returnAuth.body.statusCode).json(returnAuth.body);
    }
});

export { authRouter }
