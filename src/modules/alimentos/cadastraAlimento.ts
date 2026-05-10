import { Router } from 'express';
import { ICadastrarAlimentos } from '../../interfaces/alimentos/apiAlimentosInterface.js';
import { isValidString } from '../../utils/utils.js';

const cadastrarAlimentosRouter = Router();

async function cadastrarAlimentos(alimento: unknown, idUser: unknown): Promise<ICadastrarAlimentos> {
    if (!isValidString(idUser)) return { message: "Usuário não informado", error: true, statusCode: 400 };
    return { message: "Alimento cadastrado com sucesso", error: false, statusCode: 201 };
}

cadastrarAlimentosRouter.post('/', async (req, res) => {
    const alimento = req.body?.alimento;
    const idUser = req.body?.idUser;
    const result = await cadastrarAlimentos(alimento, idUser);
    res.status(result.statusCode);
    return res.json(result);
});

export { cadastrarAlimentosRouter };