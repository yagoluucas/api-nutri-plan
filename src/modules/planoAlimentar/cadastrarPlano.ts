import {Router} from 'express';
import { authMiddleware } from '../../middlewares/auth.js';

const cadastrarPlanoRoutes = Router();

cadastrarPlanoRoutes.post('/', authMiddleware, async (req, res) => {
    return res.json({
        message: "Plano alimentar endpoint!"
    });
});

export default cadastrarPlanoRoutes;
