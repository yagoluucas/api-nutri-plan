import assert from "node:assert/strict";
import test from "node:test";
import {
  ICadastrarPlanoAlimentarRequestSchema,
  IAtualizarPlanoAlimentarRequestSchema,
  IPlanoAlimentarSchema,
  IRetornoPlanoAlimentarSchema,
  IRetornoPlanosAlimentaresSchema,
} from "../src/interfaces/planoAlimentar/planoAlimentarInterfaces.js";

const alimento = {
  codigoAlimento: "TESTE-001",
  quantidade: 2,
  medidaSelecionada: {
    nomeMedida: "fatia",
    total: 30,
    unidadeMedida: "g",
    tipoMedida: "Caseira" as const,
  },
};

const substituicao = {
  titulo: "Opcao 2",
  observacoes: "Substituir a opcao principal",
  alimentos: [{
    ...alimento,
    codigoAlimento: "TESTE-002",
    nomeExibicao: "Aveia",
    quantidadeExibicao: "2 porcoes",
  }],
};

const refeicao = {
  nome: "Cafe da manha",
  horario: "07:30",
  alimentos: [alimento],
  substituicao,
};

test("POST preserva dados da refeicao substituta", () => {
  const result = ICadastrarPlanoAlimentarRequestSchema.parse({
    planoAlimentar: { refeicoes: [refeicao], planoAtivo: true },
  });

  assert.deepEqual(result.planoAlimentar.refeicoes[0].substituicao, substituicao);
});

test("PATCH preserva substituicao ao atualizar refeicoes", () => {
  const result = IAtualizarPlanoAlimentarRequestSchema.parse({
    planoAlimentar: { refeicoes: [refeicao] },
  });

  assert.deepEqual(result.planoAlimentar.refeicoes?.[0].substituicao, substituicao);
});

test("GET individual e listagem preservam substituicao", () => {
  const planoAlimentar = {
    id: "507f1f77bcf86cd799439011",
    planoAtivo: true,
    refeicoes: [refeicao],
  };
  const response = {
    message: "Planos alimentares recuperados com sucesso",
    error: false,
    statusCode: 200,
  };
  const individual = IRetornoPlanoAlimentarSchema.parse({
    ...response,
    planoAlimentar,
  });
  const listagem = IRetornoPlanosAlimentaresSchema.parse({
    ...response,
    planosAlimentares: [planoAlimentar],
  });

  assert.deepEqual(individual.planoAlimentar.refeicoes[0].substituicao, substituicao);
  assert.deepEqual(listagem.planosAlimentares[0].refeicoes[0].substituicao, substituicao);
});

test("planos antigos sem substituicao continuam validos", () => {
  const parsed = IPlanoAlimentarSchema.parse({
    refeicoes: [{ nome: refeicao.nome, horario: refeicao.horario, alimentos: [alimento] }],
  });

  assert.equal(parsed.refeicoes[0].substituicao, undefined);
});

test("substituicao vazia e invalida", () => {
  const result = IPlanoAlimentarSchema.safeParse({
    refeicoes: [{ ...refeicao, substituicao: { alimentos: [] } }],
  });

  assert.equal(result.success, false);
});
