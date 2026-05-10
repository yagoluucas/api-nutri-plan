import {Router} from 'express';

const cadastrarPlanoRoutes = Router();

cadastrarPlanoRoutes.post('/', async (req, res) => {
    return res.json({
        message: "Plano alimentar endpoint!"
    });
});

export default cadastrarPlanoRoutes;
