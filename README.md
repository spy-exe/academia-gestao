# Cadência — Gestão de academia

Aplicação administrativa em português para organizar alunos, planos, professores, mensalidades, fichas de treino e avaliações físicas.

- Aplicação: https://academia.malha.app
- Arquitetura: monólito modular Java 21 / Spring Boot, PostgreSQL e frontend React / TypeScript.
- Segurança: sessão de servidor, BCrypt, CSRF e primeira conta criada localmente, sem senha padrão.
- Financeiro: valores BigDecimal, preço histórico, emissão idempotente e restrição contra períodos sobrepostos.

## Verificação

Os seis módulos possuem API, interface e persistência reais. A validação local registrou 32 testes Java, 85 testes de frontend, 21 cenários Playwright e 7 testes de publicação aprovados. A cobertura é 99,47% de linhas / 93,75% de branches no backend e 96,43% / 91,82% no frontend.

O [relatório técnico](docs/verification.md) descreve escopo, evidências e limites. A [execução do CI](https://github.com/spy-exe/academia-gestao/actions/workflows/quality.yml) valida o commit; o fechamento operacional e as medições do domínio são anexados à [release](https://github.com/spy-exe/academia-gestao/releases/latest). Credenciais são fornecidas privadamente.

Capturas: [alunos no celular](docs/evidence/alunos-mobile-final.png), [formulário](docs/evidence/mobile-form-aluno.png), [dashboard](docs/evidence/dashboard-1366.png). As 45 baselines ficam em `frontend/tests/e2e/visual.spec.ts-snapshots`.

## Executar

Requisitos: Java 21, PostgreSQL 17, Node.js 22.12+ e Docker para testes de integração com Testcontainers. Os serviços da aplicação não dependem de Docker.

Crie um banco e um usuário próprio no PostgreSQL. Exporte `DB_URL`, `DB_USER` e `DB_PASSWORD` conforme `.env.example`.

```sh
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Em outro terminal:

```sh
cd frontend
npm ci
npm run dev
```

Abra o endereço informado pelo Vite. A API utiliza o proxy de desenvolvimento.

## Primeira conta

Forneça `ADMIN_EMAIL` e `ADMIN_PASSWORD` por ambiente protegido, com senha de pelo menos 14 caracteres e no máximo 72 bytes. Nunca use credenciais dos exemplos em produção.

```sh
cd backend
./mvnw package
java -jar target/academia-gestao-1.0.0.jar --spring.profiles.active=bootstrap --server.port=0
```

O comando aplica migrations, cria a primeira conta e encerra. Recusa a operação quando já existe administrador. Remova as variáveis de bootstrap após a execução. Credenciais de demonstração são entregues fora do repositório.

## IntelliJ IDEA

Abra `backend/pom.xml` como projeto Maven, selecione JDK 21 e aguarde a importação. Configure as variáveis do banco e `SPRING_PROFILES_ACTIVE=dev` na configuração de execução de `AcademiaApplication`. Não versionar configurações locais com credenciais.

## Testes

```sh
cd backend
./mvnw verify
```

O PostgreSQL dos testes é criado por Testcontainers. JaCoCo exige 90% de linhas e 85% de branches; uma falha impede a aprovação.

```sh
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

Para E2E, execute backend, PostgreSQL e frontend reais; defina `E2E_BASE_URL`, `E2E_EMAIL` e `E2E_PASSWORD`. Defina também `E2E_RUNTIME=process` e grave o PID do backend em `/tmp/academia-backend.pid`. Execute o seed explícito num banco isolado com sufixo `_demo` antes das baselines; não use o banco público para esse comando. Depois execute `npx playwright install --with-deps chromium`, `npm run build`, inicie `npx vite preview --host 127.0.0.1 --port 4173` e execute `npm run test:e2e`. Os testes de aceitação não substituem a API por mocks.

## Demonstração

O seed `infrastructure/demo-seed.sql` contém somente pessoas fictícias, e-mails reservados e dados de treinamento. Sua execução é explícita, idempotente e restrita ao ambiente de demonstração pelo script `infrastructure/seed-demo.sh`. Não existe seed automático no ambiente de produção.

Acesso aos registros exige autenticação. Pagamentos são registros administrativos; não há processamento bancário. IMC e gráficos descrevem medidas e não fornecem diagnóstico.

## Organização

`backend/` contém os domínios e migrations. `frontend/` contém componentes, formulários e testes. `infrastructure/` reúne rotinas operacionais sem segredos. `docs/evidence/` contém capturas e verificações. Os contratos visuais e de interação ficam em `DESIGN.md` e `UX-CONTRACT.md`.

## Operação e apresentação

Consulte [deploy, backup e rollback](docs/operations.md), [segurança](docs/security.md) e o [roteiro de demonstração](docs/demonstration.md). O deploy utiliza os artefatos do commit aprovado no CI, sem recompilar no servidor de publicação. Todos os serviços e ferramentas de desenvolvimento ficam na VM isolada, sem instalação da aplicação no host PVE.
