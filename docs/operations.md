# Operação e deploy

## Isolamento

Desenvolvimento, PostgreSQL, builds, Playwright, testes e serviços pertencem a uma VM Debian isolada no PVE, com 2 vCPU, até 3 GiB de RAM e disco fino de 10 GiB. Docker é utilizado apenas por Testcontainers dentro da VM; a aplicação publicada usa serviços nativos.

A implementação foi inicialmente criada no host por engano. O projeto, dependências locais e logs foram transferidos com verificação por checksum; o diretório da tarefa foi removido do host. A partir dessa correção, todas as operações de desenvolvimento ocorreram na VM. Nenhuma VM existente ou configuração global do PVE foi alterada para executar a aplicação.

O pool de armazenamento estava com capacidade reduzida no inventário. As instalações e os builds foram limitados à VM. Não houve exclusão de recursos existentes para liberar espaço.

## Configuração

Instale Java 21, PostgreSQL, Nginx e os arquivos de serviço. Crie o usuário de serviço `academia-app`, sem shell, e um usuário PostgreSQL exclusivo, sem privilégios de superusuário. O proprietário do banco precisa aplicar Flyway e instalar a extensão confiável btree_gist.

O arquivo `/etc/academia/app.env` deve ser legível somente por root e conter DB_URL, DB_USER, DB_PASSWORD, COOKIE_SECURE=true e o perfil do ambiente. O ambiente publicado de demonstração utiliza seu próprio arquivo e banco com sufixo `_demo`. Nunca copiar o arquivo real para o repositório.

Nginx serve `/opt/academia/current/frontend`, encaminha `/api/` à API em loopback e expõe `/health` sem detalhes internos. O proxy envia o protocolo externo confiável para Spring. Configurar CSP, HSTS, proteção contra framing, nosniff, limite de payload e tentativas de login. O tráfego HTTP deve redirecionar para HTTPS.

## Publicação

As releases ficam em `/opt/academia/releases/COMMIT_SHA`. Artefatos, manifesto de SHA e checksums pertencem a root. O symlink `current` é substituído atomicamente. O usuário Nginx precisa atravessar o diretório de releases; o deploy verifica sua permissão de leitura antes da troca.

```sh
sudo PUBLIC_URL=https://dominio-autorizado \
  infrastructure/deploy.sh COMMIT_SHA backend-verificado.jar frontend-dist
```

Use os artefatos do mesmo commit aprovado no GitHub Actions. Durante o desenvolvimento acadêmico, o usuário solicitou publicação incremental para acompanhar as alterações; o README identifica esse período como trabalho em andamento. A aprovação final exige todos os gates.

O script verifica a API, a página pública e o manifesto do commit. Uma falha restaura o symlink anterior quando disponível. Nunca reaplicar artefatos diferentes no mesmo diretório de SHA.

## Rollback

Identifique uma release anterior, confira seu `SHA256SUMS`, troque `current` atomicamente e reinicie o serviço. Execute health e fluxo de login. Migrations são aditivas; rollback de código não apaga dados. Uma alteração futura incompatível de schema exige plano de restauração próprio antes do deploy.

## Backup e restauração

`academia-backup.timer` executa pg_dump diariamente às 03:15 no fuso de São Paulo, com retenção de 14 dias. Os arquivos possuem permissão restrita e checksum. O teste `verify-backup.sh` restaura em um banco temporário exclusivo, valida o conteúdo e remove somente esse banco criado pelo próprio teste.

```sh
sudo systemctl start academia-backup.service
sudo infrastructure/verify-backup.sh /var/lib/academia/backups/arquivo.dump
```

O destino atual está dentro da VM. Uma cópia externa criptografada exige destino de armazenamento autorizado e continua recomendada para proteção contra perda do host; não foi inventado um destino externo.

## Diagnóstico

```sh
systemctl status academia-demo nginx postgresql
journalctl -u academia-demo --since '1 hour ago'
systemctl list-timers academia-backup.timer
curl --fail https://dominio-autorizado/health
curl --fail https://dominio-autorizado/version.json
```

Logs são estruturados em JSON. Nunca anexar arquivos de ambiente, tokens, configurações do túnel ou dumps ao GitHub. O túnel existente recebeu somente o hostname autorizado da academia; as rotas anteriores foram preservadas e a configuração foi validada antes da ativação.
