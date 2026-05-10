import { Router } from 'express';
import { conectarAoBancoDeDados } from '../../database/index.js';
import { Alimento } from '../../database/alimentoModel.js';
import { isValidString } from '../../utils/utils.js';
import { IRecuperarAlimentos } from '../../interfaces/alimentos/apiAlimentosInterface.js';

async function buscarAlimentoPeloCodigo(codigoAlimento: unknown): Promise<IRecuperarAlimentos> {
    if (!isValidString(codigoAlimento)) {
        return { message: "Código do alimento não informado", error: true, statusCode: 400 };
    }

    await conectarAoBancoDeDados();

    const alimento = await Alimento.findOne({ codigoAlimento });

    if (!alimento) {
        return { message: "Alimento não encontrado", error: true, statusCode: 404 };
    }

    return {
        message: "Alimento encontrado com sucesso",
        error: false,
        statusCode: 200,
        alimentos: [alimento]
    };
}

async function buscaAlimentoAutoComplete(nomeAlimento: unknown): Promise<IRecuperarAlimentos> {
    if (!isValidString(nomeAlimento)) {
        return { message: "Nome do alimento não informado", error: true, statusCode: 400 };
    }

    await conectarAoBancoDeDados();

    const alimentos = await Alimento.find({
        nomeAlimento: { $regex: `^${nomeAlimento}`, $options: "i" }
    }).limit(50).select("_id nomeAlimento codigoAlimento").sort({ nomeAlimento: 1 });

    if (alimentos.length === 0) {
        return { message: "Nenhum alimento encontrado", error: true, statusCode: 404 };
    }

    return {
        message: "Alimentos recuperados com sucesso",
        error: false,
        statusCode: 200,
        qtdAlimentosEncontrados: alimentos.length,
        alimentos
    };
}

// Criação das rotas
const recuperarAlimentosRouter = Router();

recuperarAlimentosRouter.get('/', async (req, res) => {
    const codigoAlimento = req.query?.codigoAlimento;
    const result = await buscarAlimentoPeloCodigo(codigoAlimento);

    res.status(result.statusCode);
    return res.json(result);
});

recuperarAlimentosRouter.get('/autocomplete', async (req, res) => {
    const nomeAlimento = req.query?.nomeAlimento;
    const result = await buscaAlimentoAutoComplete(nomeAlimento);

    res.status(result.statusCode);
    return res.json(result);
});

export { recuperarAlimentosRouter };