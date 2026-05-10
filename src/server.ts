import 'dotenv/config';
import express from 'express';
import { cadastrarAlimentosRouter, recuperarAlimentosRouter } from './modules/alimentos/crudAlimentos.js';

import cadastrarRefeicoesRoutes from './modules/refeicoes/cadastrarRefeicao.js';
import cadastrarPlanoRoutes from './modules/planoAlimentar/cadastrarPlano.js';

const app = express();
app.use(express.json());

app.use("/refeicoes", cadastrarRefeicoesRoutes)
app.use("/planoAlimentar", cadastrarPlanoRoutes)
app.use("/alimentos", recuperarAlimentosRouter)
app.use("/alimentos", cadastrarAlimentosRouter)

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000")
})