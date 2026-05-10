import express from 'express';
import alimentosRoutes from './modules/alimentos/recuperarAlimento.js';
import cadastrarRefeicoesRoutes from './modules/refeicoes/cadastrarRefeicao.js';
import cadastrarPlanoRoutes from './modules/planoAlimentar/cadastrarPlano.js';

const app = express();

app.use("/alimentos", alimentosRoutes)
app.use("/refeicoes", cadastrarRefeicoesRoutes)
app.use("/planoAlimentar", cadastrarPlanoRoutes)

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000")
})