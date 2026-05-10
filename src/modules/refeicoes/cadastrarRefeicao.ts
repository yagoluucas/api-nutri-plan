import {Router} from 'express';

const cadastrarRefeicoesRoutes = Router();

cadastrarRefeicoesRoutes.post('/', async (req, res) => {
    return res.json({
        message: "Refeições endpoint!"
    });
});

export default cadastrarRefeicoesRoutes;