# Segurança e dependências

A aplicação publicada serve arquivos estáticos pelo Nginx e executa a API Java. Node.js, Vite, Vitest e ESLint são usados somente em build/testes dentro da VM isolada e nos runners do CI. O PostgreSQL e a porta da API aceitam apenas conexões locais. O firewall da VM restringe SSH à rede administrativa e não publica bancos ou ferramentas de infraestrutura por IPv6.

Sessões utilizam cookies Secure, HttpOnly e SameSite=Strict. A API exige administrador, mantém CSRF habilitado e não permite CORS entre origens. Não há auto cadastro público. A primeira conta é criada pelo perfil bootstrap; senhas são armazenadas com BCrypt. O proxy limita tentativas de login e publica somente a aplicação por HTTPS.

## Política de análise

Gitleaks verifica todo o histórico. O CI bloqueia vulnerabilidades altas/críticas nas dependências de produção e críticas nas ferramentas de desenvolvimento. O relatório completo inclui desenvolvimento; achados sem caminho de exploração na aplicação são documentados, sem alterar os limiares de testes ou cobertura.

## Dependência de desenvolvimento sem correção publicada

O advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), atualizado em 17/11/2026, descreve ReDoS em picomatch até 4.0.7 e não informa versão corrigida. Ele afeta transitivamente ferramentas de build/testes. A atualização compatível de dependências foi aplicada, mas não resolve um advisory que abrange todas as versões publicadas.

Nesta aplicação, os padrões glob são definidos nos arquivos versionados de Vite, Vitest e ESLint; nenhum endpoint recebe ou executa globs. Picomatch não integra o bundle entregue ao navegador nem o processo Java. Builds de contribuições devem ocorrer em runners isolados, sem segredos e com tempo limitado. O achado permanece registrado como risco de ferramenta de desenvolvimento e deve ser reavaliado quando houver correção upstream. A verificação de produção continua bloqueando severidade alta.

## Backend verificado

A aplicação utiliza Java 21 e Spring Boot 4.1.2. O SBOM CycloneDX gerado a partir das dependências resolvidas contém 99 componentes de runtime. Em 18/11/2026, o OSV Scanner 2.7.1 não identificou vulnerabilidades nesse conjunto; o resultado está em `docs/evidence/backend-osv.json`. O CI repete a geração do SBOM e a análise, falhando diante de achados. Essa análise não substitui a revisão do código ou atualizações futuras.

Os testes mantêm JUnit Jupiter 5.14.4 e Testcontainers. O contexto real é iniciado pelo harness de integração, que evita depender da extensão de testes de Spring Boot 4, baseada em JUnit 6.

## Dados e operação

Seeds usam dados fictícios e exigem seleção explícita do ambiente de demonstração. Backups ficam em diretório privado, sem inclusão em Git. Contas, senhas, tokens, chaves e configurações operacionais do PVE não são arquivos do projeto. Não se afirma ausência absoluta de vulnerabilidades; os relatórios identificam ferramenta, escopo e data da verificação.
