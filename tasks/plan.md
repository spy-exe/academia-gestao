# Plano de execução — Gestão de academia

Construir aplicação administrativa em português, com seis domínios persistidos, autenticação por sessão e publicação verificável. Nenhuma etapa é concluída por inferência.

## Decisões
- Monólito modular Java 21 + Spring Boot 3.5, React/TypeScript em projeto separado; PostgreSQL e Flyway.
- Sessão de servidor, BCrypt, CSRF e mesma origem por proxy. Primeira conta provisionada por comando local, sem senha padrão.
- Valores monetários decimais, preço copiado na emissão, chave única aluno/competência, pagamento manual idempotente e status calculado por data.
- Planos mensais/trimestrais/anuais definem o intervalo de cobertura em meses; competência representa o início do período cobrado. Geração explícita por aluno e competência; sem cobrança bancária.
- Alunos arquivados mantêm históricos; planos/professores inativos não podem ser usados em novas associações. Fichas são arquivadas, sem apagar histórico.
- VM Debian isolada, serviços nativos; Docker apenas dentro da VM para Testcontainers.
- Recursos limitados: 2 vCPU, 3 GiB RAM, disco fino 10 GiB. Monitorar pool; não modificar serviços ou configurações globais.

## Sequência e aceitação
1. Inventário e VM: acesso SSH, recursos documentados e serviços existentes preservados.
2. Fundação/autenticação: migrations, sessão, CSRF e provisionamento seguro; integração PostgreSQL passa.
3. Planos/alunos: CRUD, busca/paginação, vínculo e arquivo; API/UI/testes reais.
4. Professores: CRUD/status/especialidades; vínculos íntegros.
5. Mensalidades: emissão idempotente, histórico, pagamento e métricas; testes de concorrência/integridade.
6. Treinos: ficha com aluno/professor e exercícios ordenados; criação/edição/arquivo persistidos.
7. Avaliações: medidas, IMC e evolução cronológica sem diagnóstico.
8. Dashboard: agregados e atividades reais; nenhum dado fixo.
9. QA: cobertura backend ≥90% linhas/85% branches e frontend ≥90%/85%; E2E sem mock da API.
10. Visual/acessibilidade: todas as rotas nos cinco viewports, evidências e baselines revisadas, Lighthouse.
11. Publicação: scan de histórico, GitHub público, CI verde, deploy do SHA verificado, backup/rollback/restart.

Cada fase tem testes focados e checkpoint de build antes do commit. As falhas são registradas com reprodução e correção. Revisão independente ao final; problemas altos/críticos impedem aprovação.

## Dependências externas
Domínio e autorização DNS ainda não encontrados. Não criar DNS ou alterar túneis compartilhados por suposição. Se indisponíveis, entregar deploy interno validado e registrar pendência externa.
