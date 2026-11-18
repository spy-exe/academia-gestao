import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  X,
  Pencil,
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowDownUp,
  Eye,
} from "lucide-react";
import { request, mutate, type Entity, type Page } from "./api";
import { modules } from "./registry";
import { money, date, labels, type Kind } from "./domain";
import {
  Button,
  Badge,
  Loading,
  Failure,
  Empty,
  Confirm,
  Modal,
  useFeedback,
} from "./ui";
import { EntityForm } from "./EntityForm";
function cell(value: unknown, format?: string) {
  if (format === "money") return money(value);
  if (format === "date") return date(value);
  if (format === "active")
    return <Badge value={value ? "Ativo" : "Arquivado"} />;
  if (format === "status")
    return <Badge value={labels[String(value)] ?? value} />;
  if (["plan", "student", "teacher"].includes(format ?? ""))
    return (value as Entity | undefined)?.name ?? "Sem plano";
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}
export function CollectionPage({
  kind,
  studentId,
  compact = false,
}: {
  kind: Kind;
  studentId?: number;
  compact?: boolean;
}) {
  const spec = modules[kind];
  const [params, setParams] = useSearchParams();
  const prefix = compact ? `${kind}-` : "";
  const q = params.get(`${prefix}q`) ?? "";
  const page = Math.max(0, Number(params.get(`${prefix}page`)) || 0);
  const filter = params.get(`${prefix}filter`) ?? "";
  const direction = params.get(`${prefix}direction`) ?? "asc";
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(q);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Entity | null | undefined>(
    params.get("new") === "1" ? null : undefined,
  );
  const [selected, setSelected] = useState<Entity>();
  const [action, setAction] = useState<{ item: Entity; pay: boolean }>();
  const [detail, setDetail] = useState<Entity>();
  const [localError, setLocalError] = useState("");
  const cache = useQueryClient();
  const feedback = useFeedback();
  function change(key: string, value: string, reset = true) {
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (value) next.set(`${prefix}${key}`, value);
        else next.delete(`${prefix}${key}`);
        if (reset) next.delete(`${prefix}page`);
        return next;
      },
      { replace: true },
    );
  }
  useEffect(() => {
    if (composing || search === q) return;
    const timer = setTimeout(() => {
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          if (search) next.set(`${prefix}q`, search);
          else next.delete(`${prefix}q`);
          next.delete(`${prefix}page`);
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, q, composing, prefix, setParams]);
  useEffect(() => {
    const restore = () =>
      setSearch(
        new URLSearchParams(window.location.search).get(`${prefix}q`) ?? "",
      );
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [prefix]);
  const sort = ["invoices", "workouts", "assessments"].includes(kind)
    ? (
        {
          invoices: "dueDate",
          workouts: "issuedOn",
          assessments: "assessedOn",
        } as Record<string, string>
      )[kind]
    : "name";
  const planId = params.get("planId");
  const query = new URLSearchParams({
    q,
    page: String(page),
    size: "10",
    sort,
    direction,
  });
  if (filter) query.set(kind === "invoices" ? "status" : "active", filter);
  if (studentId) query.set("studentId", String(studentId));
  if (kind === "students" && planId) query.set("planId", planId);
  const data = useQuery({
    queryKey: [kind, query.toString()],
    queryFn: ({ signal }) =>
      request<Page<Entity>>(`/${kind}?${query}`, { signal }),
  });
  useEffect(() => {
    if (data.data && page > 0 && page >= data.data.totalPages) {
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          next.set(
            `${prefix}page`,
            String(Math.max(0, data.data!.totalPages - 1)),
          );
          return next;
        },
        { replace: true },
      );
    }
  }, [data.data, page, prefix, setParams]);
  const operation = useMutation({
    mutationFn: async () => {
      if (!action) return;
      if (action.pay)
        await mutate(`/invoices/${action.item.id}/payment`, "POST", {
          paidOn: new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
        });
      else await mutate(`/${kind}/${action.item.id}`, "DELETE");
    },
    onSuccess: async () => {
      await cache.invalidateQueries();
      feedback(action?.pay ? "Pagamento registrado." : "Registro arquivado.");
      setAction(undefined);
    },
  });
  async function edit(item: Entity) {
    setLocalError("");
    try {
      const full = await request<Entity>(`/${kind}/${item.id}`);
      setEditing(full);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }
  async function inspect(item: Entity) {
    setLocalError("");
    try {
      setDetail(await request<Entity>(`/${kind}/${item.id}`));
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }
  return (
    <section className={compact ? "section-gap" : ""}>
      {!compact ? (
        <div className="page-heading">
          <div>
            <h1>{spec.title}</h1>
            <p>{spec.description}</p>
          </div>
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} />
            {spec.action}
          </Button>
        </div>
      ) : null}
      <div className="panel">
        {compact ? (
          <div className="panel-heading">
            <h2>{spec.title}</h2>
            <Button tone="neutral" onClick={() => setEditing(null)}>
              <Plus size={15} />
              {spec.action}
            </Button>
          </div>
        ) : null}
        <div className="table-toolbar">
          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (!composing) change("q", search);
            }}
          >
            <Search size={16} />
            <input
              ref={inputRef}
              aria-label={`Pesquisar ${spec.title.toLowerCase()}`}
              placeholder={
                kind === "invoices" || kind === "assessments"
                  ? "Pesquisar por aluno…"
                  : `Pesquisar ${spec.title.toLowerCase()}…`
              }
              value={search}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                className="icon-button"
                aria-label={`Limpar pesquisa de ${spec.title.toLowerCase()}`}
                onClick={() => {
                  setSearch("");
                  change("q", "");
                  inputRef.current?.focus();
                }}
              >
                <X size={16} />
              </button>
            ) : null}
          </form>
          {kind !== "assessments" ? (
            <select
              aria-label={`Filtrar ${spec.title.toLowerCase()}`}
              className="filter"
              value={filter}
              onChange={(e) => change("filter", e.target.value)}
            >
              <option value="">Todos os status</option>
              {kind === "invoices" ? (
                <>
                  <option value="OPEN">Em aberto</option>
                  <option value="OVERDUE">Vencidas</option>
                  <option value="PAID">Pagas</option>
                </>
              ) : (
                <>
                  <option value="true">Ativos</option>
                  <option value="false">Arquivados</option>
                </>
              )}
            </select>
          ) : null}
        </div>
        {localError ? (
          <p className="inline-error" role="alert">
            {localError}
          </p>
        ) : null}
        {data.isPending ? (
          <Loading />
        ) : data.isError ? (
          <Failure error={data.error} retry={() => data.refetch()} />
        ) : data.data.content.length === 0 ? (
          <Empty
            text={
              q
                ? "Tente outro termo ou limpe a pesquisa."
                : `Use “${spec.action}” para adicionar um registro.`
            }
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {spec.columns.map((c, index) => (
                    <th
                      key={c.key}
                      aria-sort={
                        index === 0
                          ? direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      {index === 0 ? (
                        <button
                          onClick={() =>
                            change(
                              "direction",
                              direction === "asc" ? "desc" : "asc",
                            )
                          }
                        >
                          {c.label}
                          <ArrowDownUp size={12} />
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.content.map((item) => (
                  <tr key={item.id}>
                    {spec.columns.map((c, index) => (
                      <td key={c.key}>
                        {index === 0 &&
                        kind !== "invoices" &&
                        kind !== "assessments" ? (
                          <div className="person">
                            <span className="person-icon" aria-hidden="true">
                              {String(item.name ?? "")
                                .split(" ")
                                .slice(0, 2)
                                .map((v) => v[0])
                                .join("")}
                            </span>
                            <div>
                              {kind === "students" ? (
                                <Link to={`/alunos/${item.id}`}>
                                  <strong>{item.name}</strong>
                                </Link>
                              ) : (
                                <button
                                  className="name-button"
                                  onClick={() => inspect(item)}
                                >
                                  <strong>{item.name}</strong>
                                </button>
                              )}
                              {item.email ? (
                                <small>{String(item.email)}</small>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          cell(item[c.key], c.format)
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="actions">
                        {kind === "invoices" ? (
                          item.status !== "PAID" ? (
                            <button
                              className="icon-button"
                              title="Registrar pagamento"
                              aria-label={`Registrar pagamento de ${(item.student as Entity).name}`}
                              onClick={() => {
                                operation.reset();
                                setAction({ item, pay: true });
                              }}
                            >
                              <Check size={17} />
                            </button>
                          ) : null
                        ) : (
                          <>
                            <button
                              className="icon-button"
                              title="Editar"
                              aria-label={`Editar ${item.name ?? spec.singular}`}
                              onClick={() => edit(item)}
                            >
                              <Pencil size={16} />
                            </button>
                            {kind !== "assessments" && item.active ? (
                              <button
                                className="icon-button"
                                title="Arquivar"
                                aria-label={`Arquivar ${item.name}`}
                                onClick={() => {
                                  operation.reset();
                                  setAction({ item, pay: false });
                                }}
                              >
                                <Archive size={16} />
                              </button>
                            ) : null}
                          </>
                        )}
                        <button
                          className="icon-button"
                          title="Consultar"
                          aria-label={`Consultar ${item.name ?? spec.singular}`}
                          onClick={() =>
                            kind === "students"
                              ? setSelected(item)
                              : inspect(item)
                          }
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            {data.data?.totalElements ?? 0} registros
            {data.isFetching && !data.isPending ? " · Atualizando…" : ""}
          </span>
          <div>
            <Button
              tone="neutral"
              disabled={page === 0 || data.isPending}
              aria-label={`Página anterior de ${spec.title.toLowerCase()}`}
              onClick={() => change("page", String(page - 1), false)}
            >
              <ChevronLeft size={15} />
            </Button>
            <span>
              {page + 1} / {Math.max(1, data.data?.totalPages ?? 1)}
            </span>
            <Button
              tone="neutral"
              disabled={!data.data || page + 1 >= data.data.totalPages}
              aria-label={`Próxima página de ${spec.title.toLowerCase()}`}
              onClick={() => change("page", String(page + 1), false)}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </div>
      {editing !== undefined ? (
        <EntityForm
          key={editing?.id ?? "new"}
          kind={kind}
          item={editing ?? undefined}
          open
          onClose={() => setEditing(undefined)}
          studentId={studentId}
        />
      ) : null}
      <Confirm
        open={!!action}
        title={
          action?.pay
            ? "Registrar pagamento?"
            : `Arquivar ${action?.item.name ?? spec.singular}?`
        }
        text={
          action?.pay
            ? `Confirme o registro administrativo de ${money(action.item.amount)}. Nenhuma transação bancária será realizada.`
            : "O registro ficará inativo e o histórico será preservado."
        }
        label={action?.pay ? "Registrar pagamento" : "Arquivar"}
        onClose={() => setAction(undefined)}
        onConfirm={() => operation.mutate()}
        busy={operation.isPending}
        error={operation.error?.message}
      />
      {detail ? (
        <Modal
          open
          title={detail.name ?? `Consulta de ${spec.singular}`}
          description="Dados registrados na academia."
          onClose={() => setDetail(undefined)}
        >
          <div className="dialog-body">
            <dl className="detail-summary">
              {spec.columns.map((c) => (
                <div key={c.key}>
                  <dt>{c.label}</dt>
                  <dd>{cell(detail[c.key], c.format)}</dd>
                </div>
              ))}
            </dl>
            {detail.notes ? <p>{String(detail.notes)}</p> : null}
            {kind === "plans" ? (
              <>
                <p>{String(detail.benefits)}</p>
                <Link to={`/alunos?planId=${detail.id}`}>
                  Consultar alunos deste plano
                </Link>
              </>
            ) : null}
            {kind === "workouts" ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Exercício</th>
                      <th>Séries</th>
                      <th>Repetições</th>
                      <th>Carga</th>
                      <th>Descanso</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.exercises as Record<string, unknown>[]).map(
                      (ex, i) => (
                        <tr key={i}>
                          {[
                            "name",
                            "sets",
                            "repetitions",
                            "loadKg",
                            "restSeconds",
                            "notes",
                          ].map((key) => (
                            <td key={key}>
                              {String(ex[key])}
                              {key === "loadKg"
                                ? " kg"
                                : key === "restSeconds"
                                  ? " s"
                                  : ""}
                            </td>
                          ))}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
            {kind === "assessments" ? (
              <dl className="detail-summary">
                {["waistCm", "chestCm", "hipCm"].map((key, i) => (
                  <div key={key}>
                    <dt>{["Cintura (cm)", "Tórax (cm)", "Quadril (cm)"][i]}</dt>
                    <dd>{String(detail[key] ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <footer>
            <Button tone="neutral" onClick={() => setDetail(undefined)}>
              Fechar consulta
            </Button>
          </footer>
        </Modal>
      ) : null}
      {selected ? (
        <Modal
          open
          title={selected.name ?? "Aluno"}
          onClose={() => setSelected(undefined)}
          description="Acompanhe todos os registros do aluno."
        >
          <div className="dialog-body">
            <Link to={`/alunos/${selected.id}`}>Abrir histórico completo</Link>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
