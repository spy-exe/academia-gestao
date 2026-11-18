# Segurança e dependências

A aplicação publicada serve arquivos estáticos pelo Nginx e executa a API Java. Node.js, Vite, Vitest e ESLint são usados somente em build/testes dentro da VM isolada e nos runners do CI. O PostgreSQL e a porta da API aceitam apenas conexões locais. O firewall da VM restringe SSH à rede administrativa e não publica bancos ou ferramentas de infraestrutura por IPv6.

Sessões utilizam cookies Secure, HttpOnly e SameSite=Strict. A API exige administrador, mantém CSRF habilitado e não permite CORS entre origens. Não há auto cadastro público. A primeira conta é criada pelo perfil bootstrap; senhas são armazenadas com BCrypt. O proxy limita tentativas de login e publica somente a aplicação por HTTPS.

## Política de análise

Gitleaks verifica todo o histórico. O CI bloqueia vulnerabilidades altas e críticas em todas as dependências JavaScript, incluindo ferramentas de desenvolvimento. O backend é analisado pelo OSV a partir do SBOM das dependências resolvidas. Os relatórios identificam escopo e data; não representam garantia de ausência absoluta de falhas.

Em 18/11/2026, as análises npm de produção e completa retornaram zero vulnerabilidades. O advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), presente numa análise anterior de picomatch, foi retirado pela base oficial nessa mesma data. Essa mudança explica a diferença entre os resultados sem atribuí-la a uma correção de código do projeto.

## Backend verificado

A aplicação utiliza Java 21 e Spring Boot 4.1.2. O SBOM CycloneDX gerado a partir das dependências resolvidas contém 99 componentes de runtime. Em 18/11/2026, o OSV Scanner 2.7.1 não identificou vulnerabilidades nesse conjunto; o resultado está em `docs/evidence/backend-osv.json`. O CI repete a geração do SBOM e a análise, falhando diante de achados. Essa análise não substitui a revisão do código ou atualizações futuras.

Os testes mantêm JUnit Jupiter 5.14.4 e Testcontainers. O contexto real é iniciado pelo harness de integração, que evita depender da extensão de testes de Spring Boot 4, baseada em JUnit 6.

## Dados e operação

Seeds usam dados fictícios e exigem seleção explícita do ambiente de demonstração. Backups ficam em diretório privado, sem inclusão em Git. Contas, senhas, tokens, chaves e configurações operacionais do PVE não são arquivos do projeto. Não se afirma ausência absoluta de vulnerabilidades; os relatórios identificam ferramenta, escopo e data da verificação.

## HTML e proxy externo

O HTML recebe `Cache-Control: public, no-cache, no-transform`. Isso mantém a revalidação e impede a injeção automática do beacon de métricas do proxy, que entrava em conflito com `script-src self`. A decisão é restrita às respostas HTML da aplicação; não modifica a configuração compartilhada da zona. O comportamento é documentado no [FAQ oficial do Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/faq/).

O Zod executa validação com `jitless: true`, evitando a sondagem de compilação dinâmica bloqueada por CSP. A regressão é verificada por eventos reais de `Audits.issueAdded` do Chromium, com a mesma política no preview usado pelo CI. Não foi necessário habilitar `unsafe-eval`.
