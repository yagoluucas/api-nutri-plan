import { Router } from 'express';

const alimentosRoutes = Router();

alimentosRoutes.get('/', (req, res) => {
    return res.json({
        message: "Alimentos endpoint!"
    })
})

export default alimentosRoutes;