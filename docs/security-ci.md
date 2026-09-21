# CI de seguranca — MVP

## Organizacao

- `.github/workflows/ci.yml`: Quality Checks (lint, build, testes gerais,
  auditoria das dependencias de producao com severidade alta/critica).
- `.github/workflows/security.yml`: Secret Scan e Security Regression.
- `tests/security/authTokens.test.ts`: tokens validos e invalidos.
- `tests/security/dataProtection.test.ts`: AES-GCM e redacao do logger.
- `tests/security/routes.test.ts`: HTTP contra o servidor real, sem mocks de
  autenticacao ou autorizacao, com MongoDB/Redis descartaveis.

O YAML orquestra; os testes ficam em TypeScript, separados por assunto.
Nao ha deploy neste PR. Nenhuma credencial real ou GitHub Secret e necessaria.
As actions estao fixadas por SHA e o binario Gitleaks por versao e checksum.
Os workflows usam permissao somente de leitura e `pull_request`, nao
`pull_request_target`. Revisar mudancas nos workflows e nos testes tambem:
codigo gerado por LLM nao deve enfraquecer checks para conseguir passar.

## Execucao automatica

Ao abrir, reabrir ou atualizar uma PR para main, os workflows executam.
Tambem executam em push para main. Nao e necessario executar nada localmente.
O Secret Scan inspeciona os commits introduzidos e o snapshot atual, com
resultados redigidos. Nao e uma auditoria de todo o historico antigo.
Uma credencial real encontrada deve ser revogada/rotacionada: apagar o arquivo
nao desfaz a exposicao. Gitleaks tem falsos positivos e falsos negativos.
Nao ignore pastas inteiras de testes nem libere regras globalmente para passar.

## Cobertura inicial

- JWT valido funciona; JWT expirado, assinatura incorreta, tipo/payload invalido
  e refresh usado como access sao rejeitados.
- Rotas privadas exercitadas devolvem 401 sem token e no-store.
- Acessos legitimos continuam funcionando.
- A lista de A nao inclui pacientes de B.
- A nao pode ler/alterar/excluir paciente ou plano de B, nem usar o ID de plano
  de B sob o caminho de seu proprio paciente. O banco permanece inalterado.
- Sessao revogada nao aceita mais o JWT; outra conta continua funcionando.
- Campos protegidos do nutricionista sao cifrados na persistencia; senha usa hash.
- Atualizacao de paciente preserva criptografia; plano de teste e cifrado.
- Perfil autorizado nao inclui senha ou hashes internos.
- AES-GCM rejeita adulteracao e uso em contexto incorreto.
- Redacao de logs protege os exemplos de credenciais/dados sensiveis exercitados.

Dados legiveis no perfil autorizado nao sao necessariamente vazamento:
criptografia em repouso e diferente do contrato de resposta autenticada.
Esta suite e uma regressao basica, nao um pentest nem prova de ausencia de
vulnerabilidades. Nao cobre todo CRUD, frontend/PDF, OAuth/MCP futuro,
todos os logs ou todos os fluxos de refresh/login. Novas rotas privadas devem
ser adicionadas a matriz de testes.

## Impedir merge (configuracao no GitHub)

O YAML sozinho nao bloqueia merge. Em Settings > Rules > Rulesets (ou
Branches > Branch protection), proteger main e:

1. Exigir pull request e os checks `Quality Checks`, `Secret Scan` e
   `Security Regression` (selecionar a origem GitHub Actions quando disponivel).
2. Exigir que a branch esteja atualizada antes do merge.
3. Nao permitir bypass, inclusive pela conta administradora, nem push direto,
   force push ou exclusao de main.

Disponibilidade depende do plano e da visibilidade do repositorio.
Nao e necessario exigir aprovacao de outro revisor em um repositorio individual.
Este PR nao configura regras administrativas nem afirma que o merge ja esta bloqueado.

## Referencias

- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- https://github.com/gitleaks/gitleaks
