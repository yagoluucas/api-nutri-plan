import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { corsOptions } from './config/cors.js';
import { recuperarAlimentosRouter } from './modules/alimentos/buscarAlimento.js';
import { cadastrarAlimentosRouter } from './modules/alimentos/cadastraAlimento.js';
import { authRouter } from './modules/auth/auth.js';
import { globalErrorHandle } from './middlewares/globalErrorHandler.js';
import cadastrarPlanoRoutes from './modules/planoAlimentar/cadastrarPlano.js';
import { atualizarPacienteRouter } from './modules/pacientes/atualizarPaciente.js';
import { buscarPacienteRouter } from './modules/pacientes/buscarPaciente.js';
import { cadastrarPacienteRouter } from './modules/pacientes/cadastrarPaciente.js';
import { deletarPacienteRouter } from './modules/pacientes/deletarPaciente.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

// Apenas para testar o funcionamento da API
app.get("/", (req, res) => {
    res.json({
        message: "Servidor rodando",
        error: false,
        statusCode: 200
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        message: "API saudavel",
        error: false,
        statusCode: 200,
        uptime: process.uptime()
    });
});

app.use("/planoAlimentar", cadastrarPlanoRoutes)
app.use("/alimentos", recuperarAlimentosRouter)
app.use("/alimentos", cadastrarAlimentosRouter)
app.use("/pacientes", cadastrarPacienteRouter)
app.use("/pacientes", buscarPacienteRouter)
app.use("/pacientes", atualizarPacienteRouter)
app.use("/pacientes", deletarPacienteRouter)
app.use("/auth", authRouter)

// Precisa ser o último middleware a ser chamado pois ele vai capturar os erros das rotas
app.use(globalErrorHandle)

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${port}`)
})
