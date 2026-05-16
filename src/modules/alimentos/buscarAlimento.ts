import { NextFunction, Request, Response, Router } from 'express';
import { conectarAoBancoDeDados } from '../../database/conexaoAoBanco.js';
import { Alimento } from '../../database/alimentoModel.js';
import { isValidString } from '../../utils/utils.js';
import { IAlimentoSchema } from '../../interfaces/alimentos/modelAlimentosInterface.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { IErrorCause } from '../../interfaces/errors/erros.js';

async function buscarAlimentoPeloCodigo(req: Request, res: Response, next: NextFunction) {

    const foodCode = req.query?.foodCode;

    if (!isValidString(foodCode)) {
        next(new Error("Código do alimento inválido", { cause: { cause: "Invalid Query Param" } as IErrorCause }));
        return;
    }

    try {
        await conectarAoBancoDeDados();

        const alimentoParsed = IAlimentoSchema.safeParse(await Alimento.findOne({ codigoAlimento: foodCode }));

        if (!alimentoParsed.success) {
            next(new Error("Alimento não encontrado", { cause: { cause: "Not Found", statusCode: 404 } as IErrorCause }));
            return;
        }

        return {
            message: "Alimento encontrado com sucesso",
            error: false,
            statusCode: 200,
            alimentos: [alimentoParsed.data]
        };
    } catch (error) {
        console.log(`[Buscar Alimento Pelo Código] - Error: ${error}`)
        next(error);
    }
}

async function buscaAlimentoAutoComplete(req: Request, res: Response, next: NextFunction) {
    const foodName = req.query.foodName;

    if (!isValidString(foodName)) {
        next(new Error("Nome do alimento não informado", { cause: { cause: "Invalid Query Param" } as IErrorCause }));
        return;
    }

    try {
        await conectarAoBancoDeDados();

        const alimentosRaw = await Alimento.find({
            nomeAlimento: { $regex: `^${foodName}`, $options: "i" }
        }).limit(50).select("nomeAlimento codigoAlimento").sort({ nomeAlimento: 1 }).lean();

        // Como estamos retornando apenas alguns campos no select(), usamos o .partial() para
        // não dar erro nos campos faltantes, e .array() para validar a lista
        const alimentos = IAlimentoSchema.partial().array().safeParse(alimentosRaw);

        if (!alimentos.success || alimentos.data.length === 0) {
            next(new Error("Erro ao validar alimentos ou nenhum encontrado", { cause: { cause: "Not Found", statusCode: 404 } as IErrorCause }));
            return;
        }

        return {
            message: "Alimentos recuperados com sucesso",
            error: false,
            statusCode: 200,
            qtdAlimentosEncontrados: alimentos.data.length,
            alimentos: alimentos.data.map((alimento) => {
                return {
                    codigoAlimento: alimento.codigoAlimento,
                    nomeAlimento: alimento.nomeAlimento
                }
            })
        };
    } catch (error) {
        console.log(`[Buscar Alimento AutoComplete] - Error: ${error}`)
        next(error);
    }
}

// Criação das rotas
const recuperarAlimentosRouter = Router();

recuperarAlimentosRouter.get('/', authMiddleware, async (req, res, next) => {
    const result = await buscarAlimentoPeloCodigo(req, res, next);
    if (result) {
        return res.status(result.statusCode).json(result);
    }
});

recuperarAlimentosRouter.get('/autocomplete', authMiddleware, async (req, res, next) => {
    const result = await buscaAlimentoAutoComplete(req, res, next);
    if (result) {
        return res.status(result.statusCode).json(result);
    }
});

export { recuperarAlimentosRouter };