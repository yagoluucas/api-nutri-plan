import {Router} from 'express';

const cadastrarAlimentosEmMassaRoutes = Router();

cadastrarAlimentosEmMassaRoutes.post('/', async (req, res) => {
    return res.json({
        message: "Alimentos endpoint em massa!"
    });
})

export default cadastrarAlimentosEmMassaRoutes;