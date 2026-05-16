import 'dotenv/config';
import express from 'express';
import { recuperarAlimentosRouter } from './modules/alimentos/buscarAlimento.js';
import { cadastrarAlimentosRouter } from './modules/alimentos/cadastraAlimento.js';
import { authRouter } from './modules/auth/auth.js';
import { globalErrorHandle } from './middlewares/globalErrorHandler.js';
import cadastrarRefeicoesRoutes from './modules/refeicoes/cadastrarRefeicao.js';
import cadastrarPlanoRoutes from './modules/planoAlimentar/cadastrarPlano.js';

const app = express();
app.use(express.json());

// Apenas para testar o funcionamento da API
app.get("/", (req, res) => {
    res.json({
        message: "Servidor rodando",
        error: false,
        statusCode: 200
    });
});

app.use("/refeicoes", cadastrarRefeicoesRoutes)
app.use("/planoAlimentar", cadastrarPlanoRoutes)
app.use("/alimentos", recuperarAlimentosRouter)
app.use("/alimentos", cadastrarAlimentosRouter)
app.use("/auth", authRouter)

// Precisa ser o último middleware a ser chamado pois ele vai capturar os erros das rotas
app.use(globalErrorHandle)

app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000")
})