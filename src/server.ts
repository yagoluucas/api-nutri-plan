import express from 'express';
import foodsRoutes from './modules/foods/index.js';

const app = express();

app.use("/foods", foodsRoutes)

app.get("/", (req, res) => {
    return res.send("Funcionando!")
})

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000")
})