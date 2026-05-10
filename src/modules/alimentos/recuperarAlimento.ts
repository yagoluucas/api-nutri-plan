import { Router } from 'express';
import { Alimento } from '../../database/alimentoModel.js';
import { conectarAoBancoDeDados } from '../../database/index.js';
import { IRecuperarAlimentos } from '../../interfaces/alimentos/apiAlimentosInterface.js';
import { isValidString } from '../../utils/utils.js';

const alimentosRoutes = Router();

async function recuperarAlimentos(nomeAlimento: unknown): Promise<IRecuperarAlimentos> {

    if (!isValidString(nomeAlimento)) return { message: "Nome do alimento não informado", error: true }

    await conectarAoBancoDeDados();
    const alimentos = await Alimento.find({ nomeAlimento: nomeAlimento });

    if (alimentos.length === 0) return { message: "Nenhum alimento encontrado", error: true };

    return { message: "Alimentos recuperados com sucesso", error: false, alimentos };
}

alimentosRoutes.get('/', async (req, res) => {
    const nomeAlimento = req.body?.nomeAlimento;
    const result = await recuperarAlimentos(nomeAlimento);
    return res.json(result);
});

export default alimentosRoutes;