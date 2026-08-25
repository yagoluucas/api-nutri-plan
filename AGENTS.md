# AGENTS.md — Nutri Plan API

## Informações gerais

Este repositório contém o back-end do Nutri Plan.

A API é desenvolvida com Node.js, Express, TypeScript, Mongoose, MongoDB, Zod, bcrypt, jsonwebtoken, cors e dotenv.

O projeto usa Node.js 22 ou superior.

O objetivo principal da API é fornecer autenticação, proteção de rotas, busca de alimentos, cadastro de refeições, criação de plano alimentar e demais funcionalidades necessárias para o fluxo do nutricionista.

## Stack principal

- Node.js >= 22
- Express
- TypeScript
- MongoDB
- Mongoose
- Zod
- bcrypt
- jsonwebtoken
- Nodemailer
- cors
- dotenv
- tsx

## Estrutura real do projeto

A estrutura principal do projeto segue este padrão:

```txt
src/
  config/
  database/
  interfaces/
  middlewares/
  modules/
  utils/
  server.ts
```

Pontos relevantes:

```txt
src/server.ts
```

Arquivo principal da aplicação. Configura Express, CORS, JSON body limit, rotas, healthcheck e middleware global de erros.

```txt
src/config/cors.ts
```

Configuração de CORS. Qualquer alteração de origem permitida, credenciais ou headers deve ser feita com cuidado.

```txt
src/database/
```

Modelos Mongoose e conexão com MongoDB.

```txt
src/interfaces/
```

Schemas Zod, tipos inferidos e contratos internos.

```txt
src/middlewares/auth.ts
```

Middleware de autenticação JWT usado em rotas protegidas.

```txt
src/middlewares/globalErrorHandler.ts
```

Middleware global de tratamento de erros. Deve permanecer como último middleware registrado no Express.

```txt
src/modules/auth/
```

Rotas e regras de autenticação.

```txt
src/modules/alimentos/
```

Rotas de busca e cadastro de alimentos.

```txt
src/modules/refeicoes/
```

Rotas relacionadas a refeições.

```txt
src/modules/planoAlimentar/
```

Rotas relacionadas ao plano alimentar.

## Como gastar menos tokens ao trabalhar neste projeto

Antes de alterar qualquer arquivo, entenda o escopo real da tarefa.

Não leia arquivos desnecessários. Priorize buscas objetivas com `rg`, leitura de arquivos específicos e inspeção incremental.

Nunca leia a pasta `node_modules`.

Evite também ler pastas geradas automaticamente, como:

- `dist`
- `build`
- `coverage`
- `.turbo`
- `.vercel`

Para entender bibliotecas, comandos e versão do Node, consulte:

- `package.json`
- `package-lock.json`
- `tsconfig.json`

Use buscas específicas:

```bash
rg "authMiddleware|Authorization|Bearer|jwt|JWT_SECRET" src
rg "safeParse|z.object|ZodError|zod" src
rg "conectarAoBancoDeDados|mongoose|Mongo" src
rg "CORS_ORIGINS|CORS_ORIGIN|FRONTEND_URL|CORS_CREDENTIALS" src
rg "alimentos|foodName|foodCode|autocomplete" src
rg "globalErrorHandle|IErrorCause|statusCode" src
```

Não reescreva módulos inteiros quando uma alteração pequena resolver o problema.

Não altere arquivos fora do escopo apenas para melhorar estilo.

Se encontrar problemas não relacionados ao pedido atual, registre no resumo final, mas não corrija sem necessidade.

## Comandos principais

Antes de finalizar qualquer alteração relevante, rode:

```bash
npm install
npm run build
npm run lint
```

Durante desenvolvimento local, use:

```bash
npm run dev
```

Para validar o build gerado, use:

```bash
npm run start
```

Este projeto possui script de lint, mas ainda não possui testes automatizados no `package.json`. Não invente comandos inexistentes.

Se adicionar lint ou testes no futuro, também atualize este arquivo.

## Regras gerais de desenvolvimento

Preserve a estrutura existente do projeto.

Prefira alterações pequenas, claras e fáceis de revisar.

Use TypeScript de forma estrita.

Não use `any` sem necessidade.

Se `any` for inevitável, limite o escopo e justifique.

Não introduza dependências novas sem necessidade real.

Não remova validações existentes sem justificativa.

Não misture refatoração ampla com correção pontual.

Não implemente features extras durante correções de segurança.

Não silencie erros sem tratamento.

Não use `catch` vazio.

Não exponha stack trace, token, secret, string de conexão ou detalhes internos em respostas da API.

Não altere contratos de resposta sem avaliar impacto no front-end.

Toda interface ou contrato de dados da API deve ser construido primeiro com schema Zod no arquivo de interfaces/types correspondente.

Tipos TypeScript devem ser inferidos a partir dos schemas com `z.infer<typeof Schema>`. Evite criar `interface` ou `type` manual duplicando o mesmo contrato que o Zod ja descreve.

Use `interface` manual apenas quando o tipo nao representar um payload validavel pelo Zod, como metodos de modelo Mongoose, tipos genericos de bibliotecas ou adaptacoes estritamente necessarias.

## Padrão de módulos e rotas

As rotas devem ficar dentro de `src/modules/<feature>/`.

Cada módulo deve exportar um `Router` do Express.

Rotas protegidas devem usar `authMiddleware`.

Rotas públicas devem ser exceções claras, como login, cadastro e healthcheck.

O registro de rotas deve continuar centralizado em `src/server.ts`.

O `globalErrorHandle` deve permanecer como último middleware registrado.

Ao criar ou alterar rota:

- Validar entrada com Zod.
- Tratar ausência de dados obrigatórios.
- Usar `next(error)` para erro controlado.
- Retornar status HTTP coerente.
- Não retornar dados sensíveis.
- Não conectar ao banco sem necessidade.
- Não criar rota pública para dados protegidos.

## Segurança em primeiro lugar

Segurança tem prioridade sobre conveniência, velocidade ou redução de código.

Nunca exponha `JWT_SECRET`, strings de conexão, tokens ou senhas em logs ou respostas.

Nunca salve senha em texto puro.

Nunca retorne senha, hash de senha ou campos sensíveis do usuário.

Nunca use `select("+senha")` fora de fluxo estritamente necessário para autenticação.

Nunca use token JWT recebido do usuário sem validação.

Nunca confie em dados vindos do request sem validação.

Nunca crie rota protegida sem `authMiddleware`.

Nunca permita acesso a `/alimentos`, `/refeicoes` ou `/planoAlimentar` sem autenticação quando os dados forem privados/protegidos.

Nunca use `CORS` aberto em produção sem necessidade.

Nunca combine `credentials: true` com origem `*` em produção.

Nunca registre token JWT no `console.log`.

Nunca envie detalhes internos do erro para o cliente.

## Autenticação e JWT

O middleware padrão para rotas protegidas é:

```txt
src/middlewares/auth.ts
```

O middleware deve:

- Ler o header `Authorization`.
- Aceitar somente o formato `Bearer <token>`.
- Validar o token com `JWT_SECRET`.
- Validar o payload com Zod.
- Buscar o usuário no banco quando necessário.
- Popular `req.user` apenas com dados seguros.
- Retornar erro 401 para token ausente, inválido ou expirado.

Rotas de autenticação ficam em:

```txt
src/modules/auth/auth.ts
```

Ao alterar login ou cadastro:

- Validar payload com Zod.
- Normalizar e-mail.
- Não retornar senha.
- Não retornar hash de senha.
- Não vazar se o erro interno foi banco, JWT ou bcrypt.
- Manter mensagens de credencial inválida genéricas.
- Garantir que `JWT_SECRET` esteja configurado.
- Garantir expiração do token com `JWT_EXPIRES_IN` ou valor padrão seguro.

## Integração com front-end e cookie httpOnly

O front-end deve tratar autenticação por cookie `httpOnly` por meio de rotas internas do Next.js.

No back-end, mantenha o contrato de autenticação seguro e previsível para consumo server-side pelo front.

O back-end não deve depender de `localStorage`, `sessionStorage` ou qualquer mecanismo do browser.

O back-end deve aceitar autenticação em rotas protegidas via:

```txt
Authorization: Bearer <token>
```

Esse token deve ser encaminhado pelo server-side do front-end, não montado manualmente pelo browser.

Não adicione lógica de cookie httpOnly diretamente no back-end sem avaliar a arquitetura de deploy, domínio, CORS e integração com o Next.js.

## CORS

A configuração de CORS fica em:

```txt
src/config/cors.ts
```

Ao alterar CORS:

- Preferir `CORS_ORIGINS`, `CORS_ORIGIN` ou `FRONTEND_URL` via ambiente.
- Normalizar URLs removendo barras finais.
- Evitar origem `*` em produção.
- Não habilitar credenciais sem necessidade.
- Validar impacto no front-end antes de restringir ou liberar origens.
- Manter `Authorization` em `allowedHeaders` quando rotas protegidas forem consumidas via Bearer token.

Variáveis relevantes:

```txt
CORS_ORIGINS
CORS_ORIGIN
FRONTEND_URL
CORS_CREDENTIALS
```

## Variáveis de ambiente

Variáveis sensíveis nunca devem ser commitadas.

Variáveis esperadas:

```txt
PORT
NODE_ENV
MONGO_DB_CONNECTION_STRING
MONGO_URL
MONGO_DB_DATABASE_NAME
JWT_SECRET
JWT_EXPIRES_IN
EMAIL_USER
EMAIL_APP_PASSWORD
JSON_BODY_LIMIT
CORS_ORIGINS
CORS_ORIGIN
FRONTEND_URL
CORS_CREDENTIALS
```

`JWT_SECRET` é obrigatório para gerar e validar tokens.

`EMAIL_USER` e `EMAIL_APP_PASSWORD` sao obrigatorios para enviar confirmacoes de cadastro. `EMAIL_APP_PASSWORD` deve ser uma senha de app do Google e nunca a senha principal da conta.

`MONGO_DB_CONNECTION_STRING` ou `MONGO_URL` é obrigatório para conectar ao MongoDB.

Não criar fallback inseguro para secrets.

Não logar valores de variáveis sensíveis.

## Banco de dados e Mongoose

A conexão com o banco deve passar por:

```txt
src/database/conexaoAoBanco.ts
```

Não criar conexões paralelas em módulos aleatórios.

Antes de conectar, reaproveite conexão ativa quando possível.

Modelos Mongoose ficam em `src/database/`.

Schemas Zod ficam preferencialmente em `src/interfaces/`.

Mongoose valida persistência e estrutura do banco.

Zod valida entrada, payload, query params, retorno crítico e contratos internos.

Não confie apenas no Mongoose para validar requests.

Não confie apenas no Zod para garantir índice único ou regra de banco.

## Validações com Zod

Use Zod para validar:

- `req.body`
- `req.params`
- `req.query`
- payload JWT decodificado
- dados críticos retornados do banco quando necessário
- contratos internos reutilizados entre módulos

Prefira `safeParse` em rotas e middlewares para controlar a resposta.

Use `parse` apenas quando o erro será capturado de forma segura pelo `globalErrorHandle`.

Sempre inferir tipos a partir dos schemas quando possível:

```ts
type LoginUser = z.infer<typeof ILoginUserSchema>;
```

Não duplicar tipos manualmente quando o schema já define o contrato.

Schemas devem ter nomes claros e consistentes.

O projeto atual usa padrão com prefixo `I`, como:

```txt
ILoginUserSchema
ITokenPayloadSchema
INutricionistaSchema
IAlimentoSchema
IErrorCauseSchema
```

Preserve esse padrão enquanto ele for o padrão dominante do projeto.

Ao validar query params, lembre que os valores chegam como `unknown`, `string`, array ou objeto dependendo do caso.

Para `/alimentos`, valide pelo menos:

- `foodCode`
- `foodName`

Não montar regex diretamente com entrada do usuário sem sanitização ou escape adequado.

Limite resultados de busca para evitar carga excessiva.

## Tratamento de erros

O middleware global fica em:

```txt
src/middlewares/globalErrorHandler.ts
```

Use `next(error)` para delegar erros controlados ao middleware global.

Para erros de negócio, use `Error` com `cause` compatível com `IErrorCauseSchema`.

Status esperados:

```txt
400 — entrada inválida
401 — não autenticado ou token inválido
403 — origem ou ação não permitida
404 — recurso não encontrado
409/422 — conflito ou regra de negócio
500 — erro interno inesperado
```

Não retornar stack trace.

Não retornar erro bruto do MongoDB, JWT, bcrypt ou ambiente.

Mensagens para usuário devem ser claras, mas sem expor detalhes internos.

## Padrões para alimentos

Arquivos relevantes:

```txt
src/modules/alimentos/buscarAlimento.ts
src/modules/alimentos/cadastraAlimento.ts
src/interfaces/alimentos/modelAlimentosInterface.ts
src/database/alimentoModel.ts
```

A busca de alimentos deve permanecer protegida por autenticação.

Rotas esperadas:

```txt
GET /alimentos?foodCode=<codigo>
GET /alimentos/autocomplete?foodName=<nome>
```

Regras:

- Usar `authMiddleware` nas rotas de recuperação de alimentos.
- Validar query params.
- Limitar quantidade de resultados no autocomplete.
- Não retornar dados além do necessário no autocomplete.
- Não permitir consulta ao banco sem usuário autenticado.
- Evitar regex insegura montada diretamente com entrada do usuário.
- Não transformar busca de alimentos em rota pública.

## Padrões para cadastro de refeições e plano alimentar

Arquivos relevantes:

```txt
src/modules/refeicoes/cadastrarRefeicao.ts
src/modules/planoAlimentar/cadastrarPlano.ts
```

Essas rotas devem permanecer protegidas.

Ao evoluir esses endpoints:

- Validar body com Zod.
- Usar usuário autenticado de `req.user` quando necessário.
- Não confiar em `idUser` vindo do body para autorização.
- Não permitir que um usuário crie ou altere dados de outro usuário sem regra explícita.
- Separar regra de negócio de resposta HTTP quando o módulo crescer.

## Senhas

Senhas devem ser armazenadas apenas com hash seguro.

O projeto usa bcrypt.

Não reduzir `saltRounds` sem justificativa forte.

Não retornar `senha` em resposta.

Não selecionar `senha` em consultas comuns.

Use `.select("+senha")` apenas no login, onde a comparação é necessária.

## JWT

Tokens devem ser assinados com `JWT_SECRET`.

Não usar segredo fixo no código.

Não usar payload maior que o necessário.

Payload atual esperado:

```txt
{ id: string }
```

Não incluir senha, e-mail, CRN ou dados sensíveis no payload sem necessidade real.

Configure expiração de token.

Não logar token gerado ou token recebido.

## TypeScript e padrão de imports

O projeto usa `module` e `moduleResolution` como `NodeNext`.

Em imports relativos TypeScript que serão emitidos para JavaScript, preserve extensão `.js` quando esse já for o padrão do projeto.

Exemplo:

```ts
import { authMiddleware } from '../../middlewares/auth.js';
```

Não trocar indiscriminadamente para imports sem extensão.

Não alterar `tsconfig.json` sem necessidade.

O projeto está com `strict: true`; mantenha compatibilidade com esse modo.

## Logs

Logs devem ajudar no diagnóstico sem expor dados sensíveis.

Pode registrar contexto do módulo, por exemplo:

```txt
[Auth Login] - Error
[AuthMiddleware] - Error
[Buscar Alimento AutoComplete] - Error
```

Não logar:

- JWT
- senha
- hash de senha
- string de conexão
- payload completo de login
- headers completos
- dados sensíveis do usuário

## Healthcheck

A API possui endpoint de healthcheck em:

```txt
GET /health
```

Mantenha esse endpoint simples e sem autenticação.

Não incluir secrets, status detalhado do banco ou informações sensíveis no healthcheck público.

## O que não fazer

Não ler `node_modules`.

Não adicionar dependência sem necessidade.

Não criar rota protegida sem `authMiddleware`.

Não confiar em `idUser` vindo do body para autorização.

Não retornar senha ou hash.

Não logar token ou secrets.

Não expor stack trace em resposta.

Não abrir CORS com `*` em produção sem análise.

Não remover validações Zod existentes.

Não trocar contratos de API sem avaliar impacto no front-end.

Não mover arquivos em refatoração ampla sem necessidade.

Não alterar arquitetura de autenticação sem avaliar front-end, CORS, cookies, domínio e deploy.

## QA obrigatório para alterações gerais

Depois de qualquer alteração relevante, rode:

```bash
npm run build
```

Se possível, rode localmente:

```bash
npm run dev
```

Validar manualmente:

```txt
GET /
GET /health
```

Resultado esperado:

- API sobe sem erro.
- Build TypeScript passa.
- Healthcheck retorna 200.
- Nenhuma variável sensível aparece em log ou resposta.

## QA obrigatório para autenticação

Quando alterar autenticação, rode:

```bash
npm run build
rg "JWT_SECRET|jwt.sign|jwt.verify|Authorization|Bearer|select\(\"\+senha\"\)|validarSenha" src
rg "console.log|console.error" src/modules/auth src/middlewares/auth.ts src/utils
```

Validar manualmente:

- Cadastro com dados válidos.
- Cadastro com e-mail já existente.
- Login com credenciais válidas.
- Login com senha inválida.
- Login com usuário inexistente.
- Rota protegida sem token retorna 401.
- Rota protegida com token inválido retorna 401.
- Rota protegida com token válido funciona.
- Respostas não retornam senha nem hash.
- Logs não exibem token nem senha.

## QA obrigatório para alimentos

Quando alterar alimentos, rode:

```bash
npm run build
rg "alimentos|foodName|foodCode|autocomplete|authMiddleware" src/modules/alimentos src/interfaces/alimentos src/database
```

Validar manualmente:

- `GET /alimentos` sem token retorna 401.
- `GET /alimentos/autocomplete` sem token retorna 401.
- `GET /alimentos?foodCode=<codigo>` com token válido retorna alimento quando existir.
- `GET /alimentos/autocomplete?foodName=<nome>` com token válido retorna lista limitada.
- Query param vazio retorna erro controlado.
- Busca sem resultado retorna erro controlado.
- Não há retorno de dados desnecessários no autocomplete.

## QA obrigatório para Zod

Quando alterar schemas, rotas ou payloads:

```bash
npm run build
rg "z.object|safeParse|parse|ZodError|z.infer" src
```

Validar:

- Body inválido retorna 400.
- Query inválida retorna 400.
- Payload JWT inválido retorna 401.
- Mensagens são úteis, mas não expõem detalhes internos.
- Tipos TypeScript são inferidos a partir dos schemas quando aplicável.

## Checklist antes de finalizar

Antes de finalizar qualquer alteração, confirme:

- `npm run build` passou.
- A alteração ficou limitada ao escopo solicitado.
- Rotas protegidas usam `authMiddleware`.
- Entradas foram validadas com Zod quando aplicável.
- Não houve exposição de token, senha, hash ou secrets.
- Não houve alteração indevida de CORS.
- Não houve alteração indevida de contrato com o front-end.
- Não foi adicionada dependência sem necessidade.
- Não foi feita refatoração ampla sem necessidade.
- O middleware global de erro continua por último no Express.
- O projeto continua compatível com Node.js >= 22 e TypeScript strict.
