import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { corsOptions } from "./config/cors.js";
import { validarConfiguracaoBancoDeDados } from "./config/database.js";
import { validarConfiguracaoEmail } from "./config/email.js";
import { validarConfiguracaoChavesSensiveis } from "./config/secrets.js";
import { recuperarAlimentosRouter } from "./modules/alimentos/buscarAlimento.js";
import { authRouter } from "./modules/auth/auth.js";
import { globalErrorHandle } from "./middlewares/globalErrorHandler.js";
import { atualizarPerfilNutricionistaRouter } from "./modules/nutricionista/atualizarNutricionista.js";
import { buscarPerfilNutricionistaRouter } from "./modules/nutricionista/buscarPerfilNutricionista.js";
import { atualizarPlanoAlimentarRouter } from "./modules/planoAlimentar/atualizarPlanoAlimentar.js";
import { buscarPlanoAlimentarRouter } from "./modules/planoAlimentar/buscarPlanoAlimentar.js";
import { cadastrarPlanoAlimentarRouter } from "./modules/planoAlimentar/cadastrarPlanoAlimentar.js";
import { deletarPlanoAlimentarRouter } from "./modules/planoAlimentar/deletarPlanoAlimentar.js";
import { atualizarPacienteRouter } from "./modules/pacientes/atualizarPaciente.js";
import { buscarPacienteRouter } from "./modules/pacientes/buscarPaciente.js";
import { cadastrarPacienteRouter } from "./modules/pacientes/cadastrarPaciente.js";
import { deletarPacienteRouter } from "./modules/pacientes/deletarPaciente.js";
import { deletarNutricionistaRouter } from "./modules/nutricionista/deleterNutricionista.js";
import helmet from "helmet";
import { installConsoleRedaction, logger } from "./utils/logger.js";
import {
  globalRateLimiter,
  readRateLimiter,
  writeRateLimiter,
} from "./middlewares/rateLimit.js";

installConsoleRedaction();
validarConfiguracaoChavesSensiveis();
validarConfiguracaoBancoDeDados();
validarConfiguracaoEmail();

const app = express();
const port = Number(process.env.PORT) || 5000;

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(globalRateLimiter);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "3mb" }));

// Apenas para testar o funcionamento da API
app.get("/", (req, res) => {
  res.json({
    message: "Servidor rodando",
    error: false,
    statusCode: 200,
  });
});

app.get("/health", (req, res) => {
  res.json({
    message: "Servidor saudavel",
    error: false,
    statusCode: 200,
  });
});

app.use(readRateLimiter);
app.use(writeRateLimiter);

app.use("/alimentos", recuperarAlimentosRouter);

app.use("/pacientes", cadastrarPacienteRouter);
app.use("/pacientes", buscarPacienteRouter);
app.use("/pacientes", atualizarPacienteRouter);
app.use("/pacientes", deletarPacienteRouter);

app.use("/pacientes", cadastrarPlanoAlimentarRouter);
app.use("/pacientes", buscarPlanoAlimentarRouter);
app.use("/pacientes", atualizarPlanoAlimentarRouter);
app.use("/pacientes", deletarPlanoAlimentarRouter);

app.use("/nutricionista", buscarPerfilNutricionistaRouter);
app.use("/nutricionista", atualizarPerfilNutricionistaRouter);
app.use("/nutricionista", deletarNutricionistaRouter);

app.use("/auth", authRouter);

// Precisa ser o último middleware a ser chamado pois ele vai capturar os erros das rotas
app.use(globalErrorHandle);

app.listen(port, "0.0.0.0", () => {
  logger.info("server_started", { port });
});
