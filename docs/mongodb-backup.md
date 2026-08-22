# Backup do MongoDB

## Objetivo

Criar um backup diário do banco de produção fora da aplicação, validar que o dump é restaurável e armazenar somente a cópia criptografada.

O backup não depende do Render nem do processo Node da API. Ele é executado pelo GitHub Actions.

## Fluxo

1. O workflow executa diariamente às 03:15 no horário de São Paulo.
2. `mongodump` gera um archive completo do banco informado em `MONGODB_BACKUP_DATABASE`.
3. Um MongoDB descartável é iniciado no runner.
4. O archive é restaurado nesse MongoDB com `mongorestore`.
5. O processo confirma que ao menos uma collection foi restaurada.
6. O archive é criptografado com AES-256 via GPG.
7. O archive em texto claro é apagado.
8. O arquivo criptografado e seu SHA-256 são enviados como artifact do workflow por 30 dias.

## Secrets necessários no GitHub

Configure em `Settings > Secrets and variables > Actions`:

- `MONGODB_BACKUP_URI`: connection string de um usuário dedicado ao backup.
- `MONGODB_BACKUP_DATABASE`: nome exato do banco de produção.
- `BACKUP_ENCRYPTION_PASSPHRASE`: senha longa e aleatória usada exclusivamente para criptografar backups.

Não reutilize `ENCRYPTION_KEY`, `SEARCH_HASH_KEY`, `JWT_SECRET` ou senha de usuário do banco para criptografar o backup.

A passphrase de backup deve existir também no gerenciador de senhas da operação. Se ela for perdida, o artifact continua existindo, mas não poderá ser descriptografado.

## Usuário MongoDB

Use um usuário separado do usuário da aplicação, com apenas os privilégios necessários para leitura/backup do banco. Não reutilize credenciais administrativas.

A URI é armazenada apenas em GitHub Actions Secrets e não deve ser adicionada ao `.env.example` ou ao repositório.

## Network Access do Atlas

O GitHub-hosted runner precisa conseguir alcançar o cluster.

Não abra `0.0.0.0/0` apenas para fazer o backup funcionar. Se o cluster estiver limitado por IP, configure uma solução de acesso que permita o runner de forma controlada antes de habilitar o schedule.

O workflow falha de forma segura se não conseguir acessar o banco; ele não altera automaticamente a allowlist do Atlas nesta PR.

## Execução manual

O workflow possui `workflow_dispatch`, portanto pode ser iniciado manualmente na aba **Actions > MongoDB Backup**.

A primeira execução deve ser manual. Só considere o processo ativo depois de confirmar que:

- o job terminou com sucesso;
- existe um artifact `.gpg`;
- existe o arquivo `.sha256` correspondente;
- o restore-check executou com sucesso.

## Restaurar um backup

Baixe o artifact da execução desejada e valide primeiro o checksum:

```bash
sha256sum -c nutriplan-*.archive.gz.gpg.sha256
```

Descriptografe para uma pasta temporária e protegida:

```bash
gpg --output nutriplan-restored.archive.gz \
  --decrypt nutriplan-*.archive.gz.gpg
```

Nunca restaure inicialmente sobre produção. Primeiro restaure em um banco temporário:

```bash
mongorestore \
  --uri="$MONGO_RESTORE_URI" \
  --archive="nutriplan-restored.archive.gz" \
  --gzip \
  --nsFrom="BANCO_PRODUCAO.*" \
  --nsTo="nutriplan_restore_test.*"
```

Depois valide quantidade de collections, documentos importantes e se os dados criptografados continuam legíveis pela aplicação com as chaves corretas de produção.

Somente após essa validação deve ser planejada uma restauração de produção.

## Chaves da aplicação

O dump contém os valores exatamente como persistidos no MongoDB. Como campos sensíveis do NutriPlan já são criptografados pela aplicação, restaurar o banco sem as chaves correspondentes não torna esses registros utilizáveis.

Mantenha separadamente no gerenciador de senhas, no mínimo:

- `ENCRYPTION_KEY`;
- `SEARCH_HASH_KEY`;
- credenciais necessárias para subir novamente a aplicação.

Essas chaves não fazem parte do artifact de backup.

## Retenção

Nesta primeira versão, cada artifact fica disponível por 30 dias.

Isso fornece até aproximadamente 30 pontos de recuperação diários. A retenção pode ser aumentada ou o destino pode ser migrado posteriormente para storage dedicado, sem alterar o formato do dump.

## Limitações desta primeira versão

- não é point-in-time recovery;
- o menor RPO é aproximadamente 24 horas;
- o workflow não gerencia automaticamente a allowlist do Atlas;
- imagens armazenadas no Cloudinary não fazem parte do dump do MongoDB;
- GitHub Actions artifact é a primeira camada de backup, não substitui uma solução dedicada de backup quando o produto crescer.
