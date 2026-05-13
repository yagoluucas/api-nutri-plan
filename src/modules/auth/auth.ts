import Nutricionista from "../../database/nutricionista.js";
import { gerarToken } from "../../utils/utils.js";
import { conectarAoBancoDeDados } from "../../database/conexaoAoBanco.js";
import { IAuth, ILoginUserSchema } from "../../interfaces/auth/authInterfaces.js";
import { INutricionistaSchema } from "../../interfaces/usuarios/nutricionistaInterfaces.js";
import { Router } from "express";

const authRouter = Router();

async function register(user: unknown): Promise<IAuth> {

    const nutricionistSafe = INutricionistaSchema.parse(user);

    if (!nutricionistSafe) {
        return {
            message: "Dados do cadastro incorreto, valide e tente novamente",
            error: true,
            statusCode: 400
        }
    }

    try {

        await conectarAoBancoDeDados();

        const nutricionistExist = await Nutricionista.findOne({ email: nutricionistSafe.email });
 
        if (nutricionistExist) {
            return {
                message: "Nutricionista já cadastrado, tente novamente",
                error: true,
                statusCode: 400
            }
        }

        const createNutricionist = await Nutricionista.create(nutricionistSafe);

        const token = gerarToken(createNutricionist._id.toString());

        return {
            message: "Nutricionista cadastrado com sucesso",
            error: false,
            token,
            statusCode: 201,
            user: {
                id: createNutricionist._id.toString(),
                nome: createNutricionist.nome,
                email: createNutricionist.email
            }
        }

    } catch (error) {
        console.log(`[Auth Register] - Error: ${error}`);
        return {
            message: "Erro ao cadastrar usuário",
            error: true,
            statusCode: 500
        }
    }
}

async function login(user: unknown): Promise<IAuth> {
    const safeUser = ILoginUserSchema.parse(user);

    if (!safeUser) {
        return {
            message: "Dados incorretos, valide e tente novamente",
            error: true,
            statusCode: 401
        }
    }

    try {
        await conectarAoBancoDeDados();
        const user = await Nutricionista.findOne({email: safeUser.email}).select("+senha");

        if(!user){
            return {
                message: "Email ou senha inválidos, confira os dados e tente novamente",
                error: true,
                statusCode: 401
            }
        }

        const isPasswordValid = await user.validarSenha(safeUser.senha);

        if(!isPasswordValid){
            return {
                message: "Email ou senha inválidos, confira os dados e tente novamente",
                error: true,
                statusCode: 401
            }
        }

        const token = gerarToken(user._id.toString());

        return {
            message: "Login realizado com sucesso",
            error: false,
            statusCode: 200,
            token,
            user: {
                id: user._id.toString(),
                nome: user.nome,
                email: user.email
            }
        }

    }catch(error) {
        console.log(`[Auth Login] - Error: ${error}`)
        return {
            message: "Erro ao realizar login",
            error: true,
            statusCode: 500
        }
    }
}

authRouter.post("/register", async (req, res) => {
    const bodyUser = req.body?.nutricionista;
    const returnAuth = await register(bodyUser);
    return res.status(returnAuth.statusCode).json(returnAuth);
});

authRouter.post("/login", async (req, res) => {
    const user = req.body?.userLogin;
    const returnAuth = await login(user);
    return res.status(returnAuth.statusCode).json(returnAuth);
});

export {authRouter}