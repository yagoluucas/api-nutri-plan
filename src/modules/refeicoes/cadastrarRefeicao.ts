import {Router} from 'express';
import { authMiddleware } from '../../middlewares/auth.js';

const cadastrarRefeicoesRoutes = Router();

cadastrarRefeicoesRoutes.post('/', authMiddleware, async (req, res) => {
    return res.json({
        message: "Refeições endpoint!"
    });
});

export default cadastrarRefeicoesRoutes;