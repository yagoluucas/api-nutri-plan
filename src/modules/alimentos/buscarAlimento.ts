import { Router } from 'express';
import { conectarAoBancoDeDados } from '../../database/conexaoAoBanco.js';
import { Alimento } from '../../database/alimentoModel.js';
import { isValidString } from '../../utils/utils.js';
import { IRecuperarAlimentos, IRecuperarAlimentosSchema } from '../../interfaces/alimentos/apiAlimentosInterface.js';
import { IAlimentoSchema } from '../../interfaces/alimentos/modelAlimentosInterface.js';
import { authMiddleware } from '../../middlewares/auth.js';

async function buscarAlimentoPeloCodigo(codigoAlimento: unknown): Promise<IRecuperarAlimentos> {
    if (!isValidString(codigoAlimento)) {
        return { message: "Código do alimento não informado", error: true, statusCode: 400 };
    }

    await conectarAoBancoDeDados();

    const alimentoParsed = IAlimentoSchema.safeParse(await Alimento.findOne({ codigoAlimento }));

    if (!alimentoParsed.success) {
        return { message: "Alimento não encontrado", error: true, statusCode: 404 };
    }

    return {
        message: "Alimento encontrado com sucesso",
        error: false,
        statusCode: 200,
        alimentos: [alimentoParsed.data]
    };
}

async function buscaAlimentoAutoComplete(nomeAlimento: unknown): Promise<IRecuperarAlimentos> {
    if (!isValidString(nomeAlimento)) {
        return { message: "Nome do alimento não informado", error: true, statusCode: 400 };
    }

    await conectarAoBancoDeDados();

    const alimentosRaw = await Alimento.find({
        nomeAlimento: { $regex: `^${nomeAlimento}`, $options: "i" }
    }).limit(50).select("nomeAlimento codigoAlimento").sort({ nomeAlimento: 1 }).lean();

    // Como estamos retornando apenas alguns campos no select(), usamos o .partial() para
    // não dar erro nos campos faltantes, e .array() para validar a lista
    const alimentos = IAlimentoSchema.partial().array().safeParse(alimentosRaw);

    if (!alimentos.success || alimentos.data.length === 0) {
        return { message: "Erro ao validar alimentos ou nenhum encontrado", error: true, statusCode: 404 };
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
}

// Criação das rotas
const recuperarAlimentosRouter = Router();

recuperarAlimentosRouter.get('/', authMiddleware, async (req, res) => {
    const codigoAlimento = req.query?.codigoAlimento;
    const result = await buscarAlimentoPeloCodigo(codigoAlimento);

    return res.status(result.statusCode).json(result);
});

recuperarAlimentosRouter.get('/autocomplete', authMiddleware, async (req, res) => {
    const nomeAlimento = req.query?.nomeAlimento;
    const result = await buscaAlimentoAutoComplete(nomeAlimento);

    return res.status(result.statusCode).json(result);
});

export { recuperarAlimentosRouter };