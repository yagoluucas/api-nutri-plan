# Integração MCP — Nutri Plan

## Objetivo

Adicionar um servidor MCP ao back-end do Nutri Plan para permitir que clientes compatíveis, inicialmente o ChatGPT, utilizem capacidades do sistema sem alterar o fluxo atual do site.

O primeiro caso de uso será um **Conversational Diet Builder**: o nutricionista descreve o plano alimentar em linguagem natural, o cliente MCP estrutura a intenção e o Nutri Plan cria apenas um rascunho para revisão profissional.

O objetivo não é permitir que a IA leia prontuários ou tome decisões clínicas de forma autônoma.

## Princípios

1. Segurança e privacidade têm prioridade sobre conveniência.
2. Minimização de dados por padrão.
3. O modelo não recebe nome, e-mail, data de nascimento, diagnóstico, observações clínicas ou prontuário do paciente sem uma necessidade futura explicitamente aprovada.
4. A IA propõe; o nutricionista revisa; o Nutri Plan registra.
5. O MCP não acessa o MongoDB diretamente.
6. Regras de negócio devem ser reutilizadas por REST e MCP.
7. O estado de seleção de paciente pertence ao domínio do Nutri Plan, não à sessão de transporte MCP.
8. Nenhuma alteração MCP será liberada em produção sem testes funcionais e de segurança.

## Identidade: quem é o nutricionista?

O ChatGPT identifica o nutricionista por OAuth 2.1 compatível com MCP.

Fluxo conceitual:

```text
ChatGPT
   |
   | OAuth 2.1 + PKCE
   v
Nutri Plan Authorization Server
   |
   | login/consentimento
   v
access token
   |
   v
MCP Nutri Plan
   |
   v
nutricionistaId interno
```

O token MCP será diferente do JWT atual usado pelo site. Ambos devem convergir para uma identidade interna confiável de nutricionista.

O MCP deve validar em toda chamada:
- issuer;
- audience/resource;
- expiração;
- scopes;
- identidade do nutricionista.

## Identidade: como o paciente é escolhido?

O ChatGPT **não pesquisa pacientes por nome**.

A seleção do paciente ocorre dentro do Nutri Plan.

### Fluxo principal

1. O nutricionista conecta sua conta do Nutri Plan ao ChatGPT via OAuth.
2. No ChatGPT, ele solicita iniciar um plano alimentar.
3. A ferramenta MCP cria uma solicitação temporária de contexto.
4. O Nutri Plan retorna um link seguro de seleção.
5. O nutricionista abre o link no Nutri Plan.
6. Se necessário, autentica-se no site.
7. O Nutri Plan verifica que o usuário do site é o mesmo nutricionista que iniciou a solicitação MCP.
8. O nutricionista escolhe o paciente dentro do Nutri Plan.
9. O backend associa temporariamente aquela conversa MCP ao paciente selecionado.
10. O ChatGPT passa a criar e atualizar somente o rascunho daquele contexto.

O nome e o ID interno do paciente não precisam ser expostos ao modelo.

## Correlação com a conversa do ChatGPT

O ChatGPT fornece em chamadas de ferramenta:

```text
_meta["openai/session"]
```

Esse valor é um identificador anonimizado da conversa.

O Nutri Plan não deve persistir o valor bruto. Ele será transformado em uma chave derivada:

```text
provider + sessionId
        |
        v
      SHA-256
        |
        v
conversationKey
```

O vínculo efetivo será semelhante a:

```text
nutricionistaId
+
conversationKey
        |
        v
patientId interno
```

O `openai/session` é uma otimização específica do ChatGPT. A abstração de domínio deve permitir no futuro outros clientes MCP com outra forma segura de correlação.

## DietContext

O `DietContext` representa um vínculo temporário entre:
- nutricionista autenticado;
- conversa MCP;
- paciente escolhido no Nutri Plan;
- finalidade permitida.

Finalidade inicial única:

```text
diet-plan-draft
```

Estados:

```text
pending
active
revoked
```

### Armazenamento

O `DietContext` deve ser armazenado no Redis, não permanentemente no MongoDB.

Motivos:
- contexto efêmero;
- expiração automática;
- revogação simples;
- menor retenção de dados;
- compatibilidade com múltiplas instâncias da API;
- baixo acoplamento com a persistência clínica principal.

TTL inicial sugerido: 30 minutos, configurável e sujeito a revisão durante os testes de UX.

Nenhum dado clínico deve ser armazenado no contexto.

## Defesa contra uso cruzado

Conhecer uma referência de contexto não concede acesso.

Toda operação deve validar simultaneamente:

```text
token OAuth válido
+
nutricionistaId do token
+
conversationKey
+
DietContext ativo
+
paciente pertencente ao nutricionista
```

Se qualquer elemento divergir, a operação deve falhar.

Isso deve ser testado explicitamente com duas contas e duas conversas.

## Arquitetura proposta

```text
ChatGPT
   |
   | OAuth + chamadas MCP
   v
/mcp
   |
   v
MCP Application Layer
   |
   +--> DietContext Service --> Redis
   |
   +--> Food Resolution Service
   |
   +--> Diet Draft Service
   |
   v
Domain/Application Services
   |
   v
MongoDB
```

O front-end continua utilizando as rotas REST atuais.

## Ferramentas do MVP

### start_diet_context

Ação autenticada.

Cria uma solicitação temporária para o nutricionista selecionar o paciente no Nutri Plan.

Não recebe nome do paciente.

Retorna apenas as informações necessárias para abrir a seleção no Nutri Plan.

### get_diet_context_status

Somente leitura.

Informa se a conversa já possui contexto ativo.

Não retorna nome, e-mail, ID interno ou dados clínicos do paciente.

Exemplo conceitual:

```json
{
  "status": "active"
}
```

### resolve_foods

Resolve nomes informados pelo nutricionista contra a base oficial de alimentos do Nutri Plan.

Entrada conceitual:

```json
{
  "foods": ["arroz branco", "feijão carioca", "peito de frango"]
}
```

Retorna apenas candidatos relevantes e medidas necessárias para montar o plano.

### create_diet_plan_draft

Cria ou substitui o rascunho de plano do contexto ativo.

O cliente pode indicar alimento, quantidade e medida, mas o servidor valida o alimento e reconstrói a medida usando os dados oficiais do banco.

O MCP nunca deve confiar em valores arbitrários de:
- total;
- unidadeMedida;
- tipoMedida.

A ferramenta não publica um plano definitivo.

### update_diet_plan_draft

Atualiza o rascunho associado ao contexto ativo.

### revoke_diet_context

Encerra explicitamente o vínculo da conversa com o paciente.

## Revisão e publicação do plano

O fluxo inicial deve ser:

```text
ChatGPT
   |
   v
rascunho estruturado
   |
   v
Nutri Plan
   |
   v
Revisão pelo nutricionista
   |
   v
Aprovar e salvar
```

O rascunho gerado por IA não será tratado automaticamente como plano final entregue ao paciente.

## Autenticação existente

O site continua usando o mecanismo JWT/sessão atual.

Não substituir ou modificar o login atual durante as primeiras fases.

```text
Site -> JWT/sessão atual ------┐
                              +-> nutricionistaId -> serviços internos
MCP  -> OAuth 2.1 ------------┘
```

## Rate limit

O rate limit MCP não deve depender somente de IP.

A chave principal deve considerar a identidade autenticada do nutricionista. Metadados anonimizados do cliente podem ser usados como camada adicional quando apropriado.

## Fases

### Fase 0 — isolamento e documentação

- branch `feat/mcp-integration`;
- draft PR;
- nenhuma mudança na produção.

### Fase 1 — fundação segura do contexto

- schemas do `DietContext`;
- geração de referências opacas;
- hash de identificadores externos de conversa;
- testes unitários;
- definição do armazenamento Redis e TTL.

### Fase 2 — separar regras internas

- extrair regras reutilizáveis de criação de plano;
- preservar exatamente o contrato REST existente;
- adicionar testes de regressão.

### Fase 3 — transporte MCP mínimo

- adicionar SDK MCP;
- endpoint `/mcp`;
- feature flag;
- ferramenta de diagnóstico sem dados de usuário;
- validar transporte no MCP Inspector.

### Fase 4 — OAuth

- OAuth 2.1;
- PKCE S256;
- protected resource metadata;
- scopes mínimos;
- validação de issuer/audience/resource;
- revogação.

### Fase 5 — DietContext

- solicitação de contexto;
- página segura de seleção no Nutri Plan;
- persistência temporária no Redis;
- vínculo com conversa;
- expiração e revogação.

### Fase 6 — alimentos

- `resolve_foods`;
- validação de códigos;
- validação de medidas;
- testes de ambiguidades.

### Fase 7 — rascunho

- `create_diet_plan_draft`;
- `update_diet_plan_draft`;
- revisão antes de publicação;
- testes de integridade.

### Fase 8 — testes externos

- MCP Inspector;
- ChatGPT em modo de desenvolvedor;
- testes positivos;
- testes negativos;
- testes de autorização cruzada;
- testes de logs;
- testes de expiração/revogação.

## Cenários de segurança obrigatórios

- MCP sem OAuth não acessa nenhuma ferramenta privada.
- Token de nutricionista A não acessa contexto de nutricionista B.
- Conversa A não reutiliza contexto da conversa B.
- Um contexto expirado não pode criar ou atualizar rascunhos.
- Um contexto revogado não pode ser reutilizado.
- Uma referência copiada para outro usuário não concede acesso.
- O paciente precisa pertencer ao nutricionista autenticado.
- Nome, e-mail, nascimento, diagnóstico e observações não aparecem em respostas MCP.
- `openai/session` bruto não é persistido.
- Tokens OAuth não aparecem em logs.
- IDs internos não são retornados ao modelo sem necessidade.
- Alimento inexistente não é inventado.
- Medida inexistente não é aceita.
- Quantidade zero ou negativa é rejeitada.
- Horário inválido é rejeitado.
- Plano sem refeições é rejeitado.
- Falha parcial não cria plano definitivo inconsistente.
- Rate limit de um usuário não bloqueia outro usuário autenticado indevidamente.
- API REST atual continua funcionando sem regressão.

## Estratégia de merge

Nenhuma implementação MCP será enviada diretamente para `main`.

O draft PR permanecerá aberto durante o desenvolvimento. Cada fase deve ser pequena, revisável e testável. O merge só será considerado quando os fluxos atuais e MCP estiverem funcionais, os testes de segurança estiverem passando e a exposição de dados tiver sido revisada.
