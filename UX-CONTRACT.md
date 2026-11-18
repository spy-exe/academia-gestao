# Contrato de interação

Fonte de regras de negócio: `tasks/plan.md`, requisitos fornecidos pelo usuário e constraints em migrations. Identidade: `DESIGN.md`.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Field em ui.tsx | Este contrato | native | teclado e popup em E2E |
| Date | Field em ui.tsx | Este contrato | native | entrada e validação E2E |
| Form | EntityForm | Zod e DTOs Bean Validation | criar/editar | componente e E2E |
| Scrollbar | styles.css | DESIGN.md | global | computed style |
| Toast | FeedbackProvider | Este contrato | success/error | live region |
| CRUD | CollectionPage | API por domínio | lista/detalhe | E2E real |

Native selects e datas são escolhas explícitas: os popups do sistema operacional são aceitos, com linguagem determinada pelo navegador. Os rótulos e formatos de leitura pertencem ao aplicativo em pt-BR. Datas de domínio usam America/Sao_Paulo; valores monetários BRL. Nenhuma interpretação médica.

Criar e editar abrem diálogo; sucesso fecha e atualiza lista/detalhe e dashboard. Cancelar edição alterada exige confirmação de descarte. Falha conserva os valores e apresenta resumo textual. Campos inválidos recebem aria-invalid e descrição; primeiro erro recebe foco. Submissão duplicada é bloqueada. Mutações financeiras aguardam confirmação do servidor.

Arquivo exige confirmação nominal e preserva históricos. Plano/professor inativo permanece consultável. Pagamento é registro administrativo e confirmado pelo usuário. Acesso aos dados requer administrador; sessão expirada abre reautenticação conservando o formulário na memória da página, sem gravar dados pessoais no armazenamento do navegador.

Busca com atraso de 300ms, respeitando composição IME, cancelamento via TanStack Query, botão limpar e Enter imediato. Paginação/filtros/ordenação na URL; filtros reiniciam página. Resultados vazios incluem orientação; erros possuem tentar novamente. Página inválida é ajustada.

Todos os fluxos têm carregamento, erro, vazio e sucesso; menus/modais restauram foco. Requisições limitadas, nenhuma escrita enfileirada offline. Conflitos de versão rejeitam sobrescrita com instrução para recarregar. Feedback compartilhado com live region; erros críticos permanecem inline. Todas as rotas têm título, sem botões inertes ou links fictícios.

Em celular, os registros têm a mesma origem, paginação, filtros e ações da tabela. A mudança de representação não cria outro estado de dados. Histórico do aluno alterna mensalidades, treinos e avaliações; navegação que troque o painel também exige confirmação quando há edição pendente. Valores e versão são capturados juntos na abertura do formulário. Falha de revalidação conserva o rascunho. A busca de referência usa Enter para buscar, sem submeter o formulário. Modais restauram o foco do controle de origem.

Novas rotas iniciam no topo. Voltar restaura a posição anterior; pesquisas, filtros e troca de histórico preservam o contexto da página.
