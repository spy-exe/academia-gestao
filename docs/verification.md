# Verificação técnica — 18/11/2026

## Repositório e aplicação

- Código: https://github.com/spy-exe/academia-gestao
- Aplicação: https://academia.malha.app
- CI por commit: https://github.com/spy-exe/academia-gestao/actions/workflows/quality.yml
- Fechamento operacional, SHA publicado e relatório final do domínio: https://github.com/spy-exe/academia-gestao/releases/latest

A release vincula os artefatos aprovados à versão publicada. Credenciais, cookies e parâmetros privados de infraestrutura não integram o repositório.

## Arquitetura e funcionalidades

Monólito modular com frontend separado. Java 21, Spring Boot 4.1.2, Spring Web MVC, JPA, Bean Validation, Security e PostgreSQL 17. Cinco migrations Flyway definem o esquema e as restrições. Maven Wrapper mantém uma estrutura convencional para importar `backend/pom.xml` no IntelliJ IDEA.

O frontend utiliza React, TypeScript, Vite, Tailwind, Radix Dialog, Lucide, Motion, Router, TanStack Query e React Hook Form/Zod. Tokens visuais são mantidos em DESIGN.md; os contratos de interação ficam em UX-CONTRACT.md.

| Módulo | Comportamento implementado e verificado |
|---|---|
| Alunos | Cadastro, edição, consulta, pesquisa, paginação, plano, arquivamento e históricos |
| Planos | Valor, periodicidade, benefícios, edição, ativação e alunos associados |
| Mensalidades | Emissão idempotente, preço histórico, períodos sem sobreposição, vencimento calculado e registro administrativo de pagamento |
| Professores | Contato, especialidades, registro opcional, status e associação aos treinos |
| Treinos | Professor e aluno, múltiplos exercícios ordenados, carga, séries, repetições, descanso, observações e histórico |
| Avaliações | Peso, altura, circunferências opcionais, IMC, edição, histórico e evolução com tabela equivalente |

O dashboard consulta agregações reais da API. Pagamentos não acionam bancos; IMC e gráficos não produzem diagnóstico clínico.

## Testes executados

| Verificação local | Resultado |
|---|---|
| JUnit 5 / Mockito / Testcontainers PostgreSQL | 32 testes aprovados, sem falhas nem testes ignorados |
| Vitest / React Testing Library | 85 testes aprovados em 8 arquivos |
| Playwright, backend e banco reais | 20 testes aprovados |
| Contratos de deploy e rollback | 7 testes aprovados |
| ESLint, TypeScript, Prettier e build Vite | Aprovados |
| Auditoria estática de UI | Zero erros e avisos |
| Lint DESIGN.md | Zero erros, seis avisos de tokens sem referência no próprio documento |

Os sete testes operacionais simulam falhas externas para verificar troca de release, recuperação, timeouts, integridade e exclusão mútua. Eles não são apresentados como substitutos do ensaio real de publicação e rollback, registrado na release.

### Cobertura

| Código de aplicação | Linhas | Branches |
|---|---:|---:|
| Backend, JaCoCo | 563/566 — 99,47% | 120/128 — 93,75% |
| Frontend, V8 | 460/477 — 96,43% | 528/575 — 91,82% |

Os gates exigem pelo menos 90% de linhas e 85% de branches. O backend não exclui pacotes para atingir a meta. No frontend, somente a montagem trivial `main.tsx` fica fora da cobertura; a lógica da aplicação permanece incluída.

### Aceitação de ponta a ponta

Os 20 testes incluem autenticação, dez testes visuais com 45 comparações de screenshot e nove cenários de aplicação. O fluxo completo cria plano/aluno/professor, associa plano, emite mensalidade duas vezes sem duplicar, registra pagamento, verifica receita, cria ficha com exercícios reordenados, registra avaliações, consulta evolução, edita, arquiva e confirma persistência após reiniciar a API real.

Há verificações de acesso anônimo, CSRF, entradas inválidas, CRUD pelo celular, seis formulários em 360px, rotação com rascunho, foco, viewport reduzido, movimento reduzido e violações CSP capturadas pelo Chromium. Esses testes de aceitação não usam mocks da API.

## Inspeção visual e acessibilidade

Foram abertas as oito páginas principais em 360×800, 390×844, 768×1024, 1366×768 e 1920×1080: 40 capturas, sem overflow da página nem erros JavaScript. As cinco telas de login completam as 45 baselines revisadas. Datas dependentes do calendário ficam ocultas apenas na comparação automática; as capturas em `docs/evidence` mostram os dados reais sem essa ocultação.

Foram inspecionados os seis formulários móveis, navegação, validação, vazio, erro de conexão e carregamento. No celular, listas exibem ações com rótulos, navegação inferior e formulários com corpo rolável e rodapé acessível. A rotação preserva formulários abertos.

O axe executou 71 auditorias de páginas e formulários nos viewports, sem violações nos critérios WCAG A/AA avaliados. Isso não equivale a uma certificação completa de acessibilidade. Lighthouse foi executado no domínio; as medições finais, coletadas após o deploy, integram a release. Screenshots e métricas vieram de Chromium real na VM; dispositivos físicos e Safari não foram executados.

## Revisão independente e correções

| Severidade encontrada | Problema e correção |
|---|---|
| Alta | Rascunhos perdidos em rotação ou revalidação de sessão: preservar instâncias, valores e versão; testes de regressão |
| Alta | Associações concorrentes a registros arquivados e cobrança sobreposta: locks transacionais, restrição no PostgreSQL e seis testes de concorrência |
| Alta | Falha no restart interrompia a recuperação: ativação condicional, recuperação validada e teste RED/GREEN |
| Alta | Probes podiam bloquear o rollback: limites de conexão/duração e teste de contrato |
| Média | Ações escondidas em tabelas no celular: registros empilhados com botões visíveis |
| Média | Contraste insuficiente em duas superfícies: cores corrigidas e 71 auditorias repetidas |
| Média | Tentativas bloqueadas por CSP: impedir injeção do beacon no HTML e usar validação Zod sem compilação dinâmica |
| Média | Consultas adicionais por associação: EntityGraphs apenas to-one, com paginação preservada |

A revisão final não identificou problemas altos ou críticos remanescentes no escopo examinado.

## Desempenho e segurança

O teste de consultas usa PostgreSQL real e associações distintas. Antes da correção, uma página de quatro itens executava 6 consultas para alunos, 10 para treinos, 6 para mensalidades e 6 para avaliações. Depois, todas ficaram dentro do orçamento de duas consultas, incluindo contagem. As listas têm limite de 50 registros por página e não carregam exercícios no resumo de treinos.

Buscas do tipo “contém” ainda varrem os candidatos no banco; não foi realizado benchmark de milhões de registros nem adicionada uma extensão de busca sem necessidade demonstrada.

O OSV analisou 99 componentes resolvidos de runtime Java, sem achados. npm audit completo e de produção retornaram zero vulnerabilidades na análise final. Gitleaks verifica histórico completo e preparação para publicação. Os relatórios estão em `docs/evidence`; o CI repete os gates e bloqueia falhas. O advisory retirado de picomatch é explicado em [security.md](security.md).

Sessões usam BCrypt, cookies Secure/HttpOnly/SameSite, CSRF e mesma origem. Não existe senha administrativa padrão ou cadastro público. HTTPS, redirecionamento HTTP, CSP, limites de login e firewall protegem a publicação. Banco e API usam loopback. Não houve publicação de arquivos de ambiente, credenciais, chaves ou dumps.

## Infraestrutura e operação

VM 120 no PVE, Debian 13, 2 vCPU, até 3 GiB de RAM e disco fino de 10 GiB. Spring Boot, PostgreSQL e Nginx são serviços nativos; Docker atende somente Testcontainers. Desenvolvimento, dependências e ferramentas de navegador ficam na VM. O túnel autorizado recebeu somente o hostname da academia.

Backup diário, retenção de 14 dias, arquivos privados e checksum. Uma restauração real em banco temporário foi executada novamente, com os seis módulos presentes; o banco público não foi apagado ou resemeado. Releases imutáveis, symlink atômico, health checks e rollback estão documentados em [operations.md](operations.md). O ensaio real entre releases é anexado ao fechamento operacional, junto ao SHA efetivamente servido.

## Limites e apresentação acadêmica

- O backup atual fica na VM. Uma cópia externa criptografada depende de destino autorizado ainda não fornecido.
- Recomenda-se reservar o endereço da VM no DHCP para manter a rota do túnel estável; não foram alteradas configurações do roteador.
- A validação móvel usa emulação de viewport e Chromium Linux. Teclados/dispositivos físicos e Safari não foram testados.
- A estrutura Maven e a execução foram verificadas; a interface gráfica do IntelliJ não foi aberta na VM sem ambiente gráfico.
- Resultados de scanners e Lighthouse têm escopo e data; não constituem garantia absoluta de segurança ou desempenho em qualquer rede.

O [roteiro de demonstração](demonstration.md) utiliza dados fictícios, mostra todos os módulos e preserva o histórico ao arquivar registros. As instruções de execução e importação ficam no README.
