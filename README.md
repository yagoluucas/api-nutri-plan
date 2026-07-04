# Nutri Plan API

Back-end do Nutri Plan desenvolvido com Node.js, Express, TypeScript, Mongoose, MongoDB e Zod.

## Debitos tecnicos

Este arquivo registra pontos conhecidos que devem ser revisitados sem bloquear o desenvolvimento atual.

### Contrato de atualizacao de paciente

Hoje a rota `PATCH /pacientes/:idPaciente` recebe o corpo dentro da propriedade `paciente`:

```json
{
  "paciente": {
    "nome": "Ana"
  }
}
```

Esse contrato funciona, mas pode ser simplificado no futuro para receber os campos diretamente no body:

```json
{
  "nome": "Ana"
}
```

Antes de alterar, validar impacto no front-end e manter compatibilidade ou planejar migracao.

### Quantidade de planos alimentares por paciente

Na listagem de pacientes, `qtdPlanos` hoje deve retornar `0` quando o paciente ainda nao possui planos carregados no documento.

Ponto a revisar: se os planos alimentares ficarem em uma collection separada, a quantidade real deve ser calculada por consulta/aggregacao no model de plano alimentar, por exemplo contando documentos vinculados ao paciente e ao nutricionista autenticado.

### Relacao entre paciente e plano alimentar

Definir claramente se o relacionamento principal sera:

- paciente armazenando referencias/resumo de planos;
- plano alimentar armazenando `idPaciente`;
- ambos, com uma estrategia clara de sincronizacao.

Evitar duplicar dados sem uma regra de consistencia definida.

### Retorno de paciente completo

As rotas que retornam paciente completo atualmente usam `planosAlimentares: paciente.planosAlimentares ?? []`.

Se planos alimentares forem carregados de outro model, esse retorno deve ser revisado para evitar passar uma lista vazia quando ja existirem planos cadastrados em outra collection.
