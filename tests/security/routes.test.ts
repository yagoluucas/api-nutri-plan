import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Nutricionista from "../../src/database/nutricionista.js";
import Paciente from "../../src/database/paciente.js";
import PlanoAlimentar from "../../src/database/planoAlimentar.js";
import Sessao from "../../src/database/sessao.js";
import { criarSessao } from "../../src/modules/auth/sessionService.js";
import { protegerPlanoAlimentar } from "../../src/modules/planoAlimentar/planoAlimentarHelpers.js";
import { isAesGcmEncrypted } from "../../src/utils/encryption.js";
import { configureSecurityEnvironment } from "./environment.js";

// These endpoints are deliberately fixed to local, disposable CI services.
// Never accept a production URI/database via inherited environment variables.
configureSecurityEnvironment();
const databaseName = `nutri_security_${randomBytes(8).toString("hex")}`;
const mongoUri = "mongodb://127.0.0.1:27017";
const baseUrl = "http://127.0.0.1:5099";
const fakePassword = "Ficticia#123";

async function request(path: string, token?: string, method = "GET", body?: unknown) {
  return fetch(baseUrl + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5_000),
  });
}

test("regressao de seguranca nas rotas reais", { timeout: 90_000 }, async (t) => {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    NODE_ENV: "test",
    DOTENV_CONFIG_PATH: "/dev/null",
    PORT: "5099",
    MONGO_DB_CONNECTION_STRING: mongoUri,
    MONGO_DB_DATABASE_NAME: databaseName,
    REDIS_URL: "redis://127.0.0.1:6379/15",
    FRONTEND_URL: "http://localhost:3000",
    CLOUDINARY_CLOUD_NAME: "test-only",
    CLOUDINARY_API_KEY: "test-only",
    CLOUDINARY_API_SECRET: randomBytes(32).toString("hex"),
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    SEARCH_HASH_KEY: process.env.SEARCH_HASH_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  };
  await mongoose.connect(mongoUri, { dbName: databaseName, serverSelectionTimeoutMS: 5_000 });
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    env, stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs = (logs + String(chunk)).slice(-20_000); });
  child.stderr.on("data", (chunk) => { logs = (logs + String(chunk)).slice(-20_000); });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    try {
      assert.equal(mongoose.connection.name, databaseName);
      assert.match(databaseName, /^nutri_security_[a-f0-9]{16}$/);
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    assert.equal(child.exitCode, null, "API encerrou antes do healthcheck");
    try {
      ready = (await request("/health")).status === 200;
    } catch {
      // Connection refused is expected while the child starts.
    }
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, "API nao ficou pronta com os servicos locais de teste");

  const users = [];
  for (const suffix of ["alpha", "beta"]) {
    users.push(await Nutricionista.create({
      nome: "Teste", sobrenome: suffix, email: `${suffix}@example.com`,
      crn: `TEST-${suffix}`, dataNascimento: "1990-01-01", senha: fakePassword,
    }));
  }
  const [a, b] = users;
  const tokenA = (await criarSessao(String(a._id))).accessToken;
  const tokenB = (await criarSessao(String(b._id))).accessToken;
  const patients = [];
  for (const user of users) {
    patients.push(await Paciente.create({
      idNutricionista: String(user._id), nome: "Paciente", sobrenome: user.getSobrenomeDescriptografado(),
      sexo: "Outro", observacoes: "Observacao ficticia",
    }));
  }
  const [pa, pb] = patients;
  const pathA = `/pacientes/${pa._id}`;
  const pathB = `/pacientes/${pb._id}`;
  const plan = await PlanoAlimentar.create({
    idPaciente: String(pb._id), planoAtivo: true,
    ...protegerPlanoAlimentar({
      tituloPlano: "Plano ficticio",
      refeicoes: [{ nome: "Almoco", horario: "12:00", alimentos: [{
        codigoAlimento: "fixture", quantidade: 1,
        medidaSelecionada: { nomeMedida: "Gramas", total: 100, unidadeMedida: "g", tipoMedida: "Tecnica" },
      }] }],
    }),
  });

  await t.test("rotas privadas negam acesso sem token", async () => {
    const routes = [
      ["GET", "/nutricionista/perfil"], ["PATCH", "/nutricionista"], ["DELETE", "/nutricionista"],
      ["GET", "/alimentos"], ["GET", "/alimentos/autocomplete?foodName=arroz"],
      ["GET", "/pacientes"], ["POST", "/pacientes"], ["GET", pathB],
      ["PATCH", pathB], ["DELETE", pathB],
      ["GET", `${pathB}/planos-alimentares`], ["POST", `${pathB}/planos-alimentares`],
      ["PATCH", `${pathB}/planos-alimentares/${plan._id}`],
      ["DELETE", `${pathB}/planos-alimentares/${plan._id}`],
    ];
    for (const [method, path] of routes) {
      const response = await request(path, undefined, method);
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.equal((await response.json()).error, true);
    }
  });
  await t.test("JWT invalido ou expirado recebe 401 pela rota", async () => {
    const expired = jwt.sign({
      id: String(a._id), sessionId: new mongoose.Types.ObjectId().toString(), type: "access",
    }, process.env.JWT_SECRET!, { expiresIn: -1 });
    for (const token of ["invalid-token", expired]) {
      assert.equal((await request("/pacientes", token)).status, 401);
    }
  });
  await t.test("proprietario acessa paciente e lista nao mistura contas", async () => {
    assert.equal((await request(pathA, tokenA)).status, 200);
    assert.equal((await request(pathB, tokenB)).status, 200);
    const response = await request("/pacientes", tokenA);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.pacientes.map((p: { id: string }) => p.id), [String(pa._id)]);
    const plans = await request(`${pathB}/planos-alimentares`, tokenB);
    assert.equal(plans.status, 200);
    assert.ok((await plans.text()).includes("Plano ficticio"));
  });
  await t.test("acesso cruzado nao le, altera nem exclui paciente ou plano", async () => {
    const beforePatient = await Paciente.collection.findOne({ _id: pb._id });
    const beforePlan = await PlanoAlimentar.collection.findOne({ _id: plan._id });
    for (const [method, path, body] of [
      ["GET", pathB, undefined],
      ["PATCH", pathB, { paciente: { nome: "Alterado" } }],
      ["DELETE", pathB, undefined],
      ["GET", `${pathB}/planos-alimentares`, undefined],
      ["PATCH", `${pathB}/planos-alimentares/${plan._id}`, { planoAlimentar: { tituloPlano: "Alterado" } }],
      ["DELETE", `${pathB}/planos-alimentares/${plan._id}`, undefined],
      ["PATCH", `${pathA}/planos-alimentares/${plan._id}`, { planoAlimentar: { tituloPlano: "Alterado" } }],
      ["DELETE", `${pathA}/planos-alimentares/${plan._id}`, undefined],
    ] as const) {
      const response = await request(path, tokenA, method, body);
      assert.equal(response.status, 404, `${method} ${path}`);
      const text = await response.text();
      assert.ok(!text.includes("Plano ficticio") && !text.includes("Observacao ficticia"));
    }
    assert.deepEqual(await Paciente.collection.findOne({ _id: pb._id }), beforePatient);
    assert.deepEqual(await PlanoAlimentar.collection.findOne({ _id: plan._id }), beforePlan);
  });
  await t.test("persistencia cifra dados e perfil nao expoe credenciais", async () => {
    const raw = await Nutricionista.collection.findOne({ _id: a._id });
    assert.ok(raw);
    for (const field of ["nome", "sobrenome", "email", "crn", "dataNascimento"] as const) {
      assert.ok(isAesGcmEncrypted(raw[field]), field);
    }
    assert.notEqual(raw.senha, fakePassword);
    assert.match(raw.senha, /^\$2[aby]\$/);
    const response = await request("/nutricionista/perfil", tokenA);
    assert.equal(response.status, 200);
    const profile = await response.json();
    assert.equal(profile.nutricionista.email, "alpha@example.com");
    for (const forbidden of ["senha", "emailHash", "crnHash", "refreshTokenHash"]) {
      assert.ok(!JSON.stringify(profile).includes(`"${forbidden}"`), forbidden);
    }
    assert.ok(isAesGcmEncrypted(plan.conteudoProtegido));
    const update = await request(pathA, tokenA, "PATCH", { paciente: { nome: "Atualizado" } });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).paciente.nome, "Atualizado");
    const patient = await Paciente.collection.findOne({ _id: pa._id });
    assert.ok(patient && isAesGcmEncrypted(patient.nome));
  });
  await t.test("sessao revogada perde acesso mesmo com JWT ainda valido", async () => {
    await Sessao.updateMany({ nutricionistaId: String(a._id) }, { $set: { revokedAt: new Date() } });
    assert.equal((await request("/pacientes", tokenA)).status, 401);
    assert.equal((await request("/pacientes", tokenB)).status, 200);
  });
  await t.test("logs nao incluem as chaves ou tokens usados nos testes", () => {
    for (const value of [env.ENCRYPTION_KEY!, env.JWT_SECRET!, tokenA, tokenB, fakePassword]) {
      assert.ok(!logs.includes(value));
    }
  });
});
