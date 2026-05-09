import { Router } from 'express';

const foodRoutes = Router();

foodRoutes.get('/', (req, res) => {
    return res.json({
        message: "Foods endpoint!"
    })
})

export default foodRoutes