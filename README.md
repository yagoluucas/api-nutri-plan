# Nutri Plan API

Back-end do Nutri Plan desenvolvido com Node.js, Express, TypeScript, Mongoose, MongoDB e Zod.

## Bancos de desenvolvimento e producao

O nome do banco e sempre selecionado por `MONGO_DB_DATABASE_NAME`. Mesmo que a connection string contenha outro nome, a opcao `dbName` do Mongoose prevalece.

Ambiente local:

```env
NODE_ENV=development
MONGO_DB_DATABASE_NAME=aplicacao_nutricional_dev
```

Ambiente de producao:

```env
NODE_ENV=production
MONGO_DB_DATABASE_NAME=aplicacao_nutricional
```

Para criar as collections e os indices da aplicacao no banco de desenvolvimento, sem copiar dados de producao:

```bash
npm run db:init:dev
```

O comando recusa qualquer banco diferente de `aplicacao_nutricional_dev`, valida uma escrita temporaria apenas em desenvolvimento e remove o documento tecnico ao concluir. O backend tambem recusa iniciar quando `development` ou `test` aponta para `aplicacao_nutricional`.

## Criptografia dos planos alimentares

O conteudo clinico de novos planos alimentares e armazenado com AES-256-GCM, usando a `ENCRYPTION_KEY`. A variavel ja esta declarada como segredo manual no Render (`sync: false`) e deve conter 64 caracteres hexadecimais (32 bytes).

Para criptografar planos legados que ainda estejam em texto claro, execute uma unica vez no ambiente que aponta para o banco correto:

```bash
npm run migrate:encrypt-diet-plans
```

A migracao e idempotente: ela apenas cifra documentos sem `conteudoProtegido`, remove os campos legados em texto claro e nao altera planos ja protegidos. Se encontrar um documento legado invalido, ele e mantido intacto e o comando termina com erro para revisao manual.

## Chaves isoladas por ambiente

`ENCRYPTION_KEY`, `SEARCH_HASH_KEY`, `JWT_SECRET` e `JWT_REFRESH_SECRET` sao configuradas com valores independentes em cada ambiente. A producao continua usando os nomes atuais no Render; o arquivo `.env` local deve conter apenas as chaves de desenvolvimento.

Em desenvolvimento, tambem configure os quatro `PROD_*_FINGERPRINT` do `.env`. Eles sao fingerprints SHA-256 nao reversiveis das chaves de producao, gerados em um ambiente seguro, e permitem recusar uma chave de producao sem copiar o segredo para a maquina local. A API falha antes de iniciar se alguma chave estiver ausente, invalida, repetida ou coincidir com um fingerprint de producao.

Para gerar cada chave local com 32 bytes aleatorios usando o Node.js 22+:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Execute o comando quatro vezes e use valores diferentes para as quatro variaveis de desenvolvimento.

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
