# Nutri Plan API

Back-end do Nutri Plan desenvolvido com Node.js, Express, TypeScript, Mongoose, MongoDB e Zod.

## Confirmacao de e-mail no cadastro

`POST /auth/register` valida os dados e envia um link de confirmacao, mas nao cria o nutricionista nem uma sessao. O front-end abre o link em `FRONTEND_URL/confirmar-email`, le o token do fragmento da URL e envia `{ "token": "..." }` para `POST /auth/register/confirm`. O cadastro e persistido somente depois dessa confirmacao.

Links de confirmacao expiram em 30 minutos e podem receber reenvio por `POST /auth/register/resend`. Para permitir um novo link, a pendencia criptografada e mantida por ate 24 horas e depois removida automaticamente pelo MongoDB. Dados pessoais ficam protegidos com AES-256-GCM, a senha permanece somente como hash bcrypt, e tokens e IPs nao sao armazenados em texto claro.

O envio usa a API HTTPS do Resend. Configure:

```env
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=Integrale Nutrição
```

`RESEND_API_KEY` e `RESEND_FROM_EMAIL` podem permanecer vazias enquanto o provider nao estiver configurado. A aplicacao inicia normalmente, mas tentativas de envio retornam um erro controlado e nao simulam entrega. O envio real exige um dominio verificado no Resend; nunca versione a API key.

## Cadastro unico de nutricionista

Para criar uma unica conta sem depender de confirmacao por e-mail, configure no ambiente de deploy:

```env
SINGLE_USER_REGISTRATION_ENABLED=true
SINGLE_USER_REGISTRATION_SECRET=
```

Gere o segredo com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Com o modo ativo, envie o mesmo body de cadastro para `POST /auth/register` pelo Postman ou cURL e acrescente o header `X-Registration-Secret`. O segredo deve existir apenas no ambiente do servidor e na chamada administrativa; nunca o coloque no front-end ou no repositorio.

```bash
curl -X POST https://sua-api.example.com/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Registration-Secret: $SINGLE_USER_REGISTRATION_SECRET" \
  --data '{"nutricionista":{"nome":"Nome","sobrenome":"Sobrenome","email":"pessoa@example.com","dataNascimento":"1990-01-01","crn":"CRN-00000","senha":"Troque#123"}}'
```

A primeira chamada autorizada cria diretamente o nutricionista e grava uma trava permanente. Depois disso, somente as rotas de cadastro de nutricionista (`/auth/register`, `/auth/register/resend` e `/auth/register/confirm`) ficam indisponiveis. Login, pacientes, alimentos e planos alimentares continuam funcionando normalmente. A resposta de criacao nao inicia uma sessao; valide o acesso usando `POST /auth/login`.

Para reabrir cadastros no futuro, sera necessario desativar a flag e remover administrativamente o marcador da collection `singleUserRegistrationLocks`. Nao existe rota publica para remover essa trava.

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

### P1 — Coerencia de sessao entre abas e troca de conta

Ao duplicar uma aba autenticada, fazer logout em uma delas e entrar com outra conta, a aba antiga pode continuar exibindo os dados visuais da primeira conta. Como cookies de autenticacao sao compartilhados entre abas do mesmo navegador, uma nova requisicao dessa aba antiga pode ser enviada com a sessao da conta mais recente e executar uma escrita em nome dela.

O back-end atualmente usa o `nutricionistaId` validado da sessao para cadastrar e consultar pacientes, portanto o registro fica associado ao proprietario do token realmente recebido. A pendencia e impedir que uma interface desatualizada execute a acao sob uma identidade diferente daquela mostrada ao usuario.

No back-end, `POST /auth/logout` exige o access token via `Authorization: Bearer`, identifica a sessao pelo payload validado e a revoga no banco. As rotas protegidas verificam essa revogacao a cada requisicao e enviam `Cache-Control: no-store`; por isso, depois do logout, uma aba com o token antigo nao consegue consultar ou alterar dados novamente. O front-end ainda precisa remover imediatamente da tela os dados que ja estavam carregados.

Antes de encerrar esta pendencia:

- sincronizar eventos de login, logout e troca de conta entre abas;
- ao recuperar foco, revalidar a identidade da sessao antes de permitir operacoes protegidas;
- rejeitar operacoes de escrita quando o contexto de sessao esperado pela aba divergir da sessao autenticada no servidor;
- redirecionar ou atualizar imediatamente abas com sessao revogada ou substituida;
- adicionar um teste com duas abas garantindo que uma aba desatualizada nao consiga criar, alterar ou excluir dados sob a nova conta.

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
