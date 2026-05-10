import 'dotenv/config';
import express from 'express';
import alimentosRoutes from './modules/alimentos/recuperarAlimento.js';
import cadastrarRefeicoesRoutes from './modules/refeicoes/cadastrarRefeicao.js';
import cadastrarPlanoRoutes from './modules/planoAlimentar/cadastrarPlano.js';
import cadastrarAlimentosEmMassaRoutes from './modules/alimentos/cadastrarAlimentosEmMassa.js';

const app = express();
app.use(express.json());

app.use("/alimentos", alimentosRoutes)
app.use("/refeicoes", cadastrarRefeicoesRoutes)
app.use("/planoAlimentar", cadastrarPlanoRoutes)
app.use("/alimentos/emMassa", cadastrarAlimentosEmMassaRoutes)

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000")
})