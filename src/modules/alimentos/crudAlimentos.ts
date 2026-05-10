import { Router } from 'express';
import { Alimento } from '../../database/alimentoModel.js';
import { conectarAoBancoDeDados } from '../../database/index.js';
import { IRecuperarAlimentos, ICadastrarAlimentos } from '../../interfaces/alimentos/apiAlimentosInterface.js';
import { isValidString } from '../../utils/utils.js';

const recuperarAlimentosRouter = Router();
const cadastrarAlimentosRouter = Router();

async function recuperarAlimentos(nomeAlimento: unknown): Promise<IRecuperarAlimentos> {

    if (!isValidString(nomeAlimento)) return { message: "Nome do alimento não informado", error: true, statusCode: 400 }

    await conectarAoBancoDeDados();
    const alimentos = await Alimento.find({ nomeAlimento: nomeAlimento });

    if (alimentos.length === 0) return { message: "Nenhum alimento encontrado", error: true, statusCode: 404 };

    return { message: "Alimentos recuperados com sucesso", error: false, statusCode: 200, alimentos };
}

async function cadastrarAlimentos(alimento: unknown): Promise<ICadastrarAlimentos> {
    return { message: "Alimento cadastrado com sucesso", error: false, statusCode: 201 };
}

recuperarAlimentosRouter.get('/', async (req, res) => {
    const nomeAlimento = req.query?.nomeAlimento;
    const result = await recuperarAlimentos(nomeAlimento);
    res.status(result.statusCode);
    return res.json(result);
});

cadastrarAlimentosRouter.post('/', async (req, res) => {
    const alimento = req.body?.alimento;
    const result = await cadastrarAlimentos(alimento);
    res.status(result.statusCode);
    return res.json(result);
});

export { cadastrarAlimentosRouter, recuperarAlimentosRouter };