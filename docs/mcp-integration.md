# Integração MCP — Nutri Plan

## Objetivo

Adicionar um servidor MCP ao back-end do Nutri Plan para permitir que clientes compatíveis, inicialmente o ChatGPT, utilizem capacidades do sistema sem alterar o fluxo atual do site.

O primeiro caso de uso é permitir que um nutricionista autenticado descreva um plano alimentar em linguagem natural e que o cliente MCP converta esse pedido em chamadas estruturadas para o Nutri Plan.

## Regra principal de segurança

A integração MCP não pode alterar o comportamento dos endpoints REST existentes até que esteja validada.

A produção continua baseada na branch `main`. O desenvolvimento MCP ocorre na branch `feat/mcp-integration` e só poderá ser integrado depois de:

1. build, lint e testes passarem;
2. endpoints REST existentes permanecerem compatíveis;
3. ferramentas MCP terem schemas de entrada e saída validados;
4. autenticação e autorização serem verificadas;
5. cenários positivos e negativos serem testados no MCP Inspector;
6. teste controlado no ChatGPT ser concluído.

## Arquitetura proposta

```text
ChatGPT / cliente MCP
        |
        | Streamable HTTP
        v
      /mcp
        |
        v
 Ferramentas MCP
        |
        v
 Serviços internos
   |          |
   v          v
Pacientes   Alimentos
   |
   v
Plano alimentar
   |
   v
MongoDB
```

O MCP não deve acessar o MongoDB diretamente. As ferramentas devem reutilizar regras internas da aplicação.

## Ferramentas do MVP

### find_patient

Objetivo: localizar um paciente pertencente ao nutricionista autenticado.

Retorno mínimo:
- referência interna do paciente;
- nome de exibição mínimo necessário para desambiguação.

Não retornar prontuário, observações clínicas, e-mail, data de nascimento ou outros dados sem necessidade explícita.

### resolve_foods

Objetivo: resolver nomes informados pelo usuário para alimentos existentes no banco do Nutri Plan.

Entrada conceitual:

```json
{
  "foods": ["arroz branco", "feijão carioca", "peito de frango"]
}
```

A ferramenta deve retornar candidatos reais do banco e suas medidas disponíveis.

### create_diet_plan

Objetivo: criar um plano alimentar para um paciente autorizado.

O cliente pode escolher alimento, quantidade e medida, mas o servidor deve validar o código do alimento e reconstruir a medida selecionada a partir dos dados oficiais do banco antes de persistir.

O MCP nunca deve confiar em valores arbitrários de `total`, `unidadeMedida` ou `tipoMedida` enviados pelo cliente.

## Autenticação

O site continua usando o mecanismo JWT/sessão atual.

A integração MCP terá uma camada de autorização própria compatível com o fluxo de autorização MCP. Ambos os caminhos devem terminar em uma identidade interna de nutricionista confiável.

```text
Site -> sessão/JWT atual ----┐
                            +-> nutricionistaId -> serviços internos
MCP  -> autorização MCP ----┘
```

Não substituir ou modificar o login atual durante as primeiras fases.

## Rate limit

O rate limit MCP não deve depender somente de IP porque diferentes usuários podem chegar por infraestrutura compartilhada do cliente MCP.

O plano é aplicar limites por identidade autenticada do nutricionista, mantendo proteção adicional por IP quando apropriado.

## Fases

### Fase 0 — isolamento e documentação

- branch `feat/mcp-integration`;
- draft PR para executar CI;
- nenhuma alteração de runtime.

### Fase 1 — separar regra de criação de plano

Extrair a regra de criação do plano alimentar para uma função interna reutilizável.

A rota REST atual deve continuar aceitando exatamente:

```http
POST /pacientes/:idPaciente/planos-alimentares
```

com o mesmo contrato e resposta atuais.

### Fase 2 — camada MCP mínima

- adicionar SDK MCP;
- expor endpoint `/mcp`;
- registrar inicialmente ferramenta sem acesso a dados sensíveis para validar transporte.

### Fase 3 — resolução de alimentos

- `resolve_foods`;
- validar códigos e medidas usando dados do banco;
- adicionar testes de ambiguidades e alimentos inexistentes.

### Fase 4 — pacientes

- `find_patient`;
- retorno mínimo;
- verificar sempre propriedade do paciente pelo nutricionista autenticado.

### Fase 5 — criação de plano

- `create_diet_plan`;
- reutilizar serviço interno;
- validar alimento e medida no servidor;
- impedir acesso cruzado entre nutricionistas.

### Fase 6 — autorização MCP

- fluxo de autorização compatível com MCP;
- scopes mínimos;
- revogação;
- rate limit por identidade.

### Fase 7 — testes externos

- MCP Inspector;
- ChatGPT em modo de desenvolvedor;
- cenários válidos, inválidos e tentativas de acesso indevido.

## Cenários de teste obrigatórios

- API atual continua criando plano normalmente.
- API atual continua listando e atualizando planos.
- Requisição MCP sem autenticação não acessa dados privados.
- Nutricionista A não localiza nem cria plano para paciente do nutricionista B.
- Alimento inexistente não é inventado.
- Medida inexistente não é aceita.
- Quantidade zero ou negativa é rejeitada.
- Horário inválido é rejeitado.
- Plano sem refeições é rejeitado.
- Falha parcial não cria plano inconsistente.
- Nenhum token ou dado clínico aparece em logs.
- Rate limit de um usuário não deve bloquear outro usuário autenticado indevidamente.

## Estratégia de merge

Nenhuma implementação MCP será enviada diretamente para `main`.

O draft PR permanecerá aberto durante o desenvolvimento. Cada etapa deve ser pequena e revisável. O merge só será considerado quando a integração estiver funcional e os testes do fluxo atual e do MCP estiverem passando.
