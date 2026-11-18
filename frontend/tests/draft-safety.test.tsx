import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../src/App";
import { CollectionPage } from "../src/CollectionPage";
import { EntityForm } from "../src/EntityForm";
import { StudentDetail } from "../src/StudentDetail";
import { FeedbackProvider } from "../src/ui";
import { ApiError, type Entity } from "../src/api";
import type { Kind } from "../src/domain";
import { records, dashboard } from "./fixtures";

const api = vi.hoisted(() => ({
  request: vi.fn(),
  mutate: vi.fn(),
  login: vi.fn(),
}));
vi.mock("../src/api", async (original) => ({
  ...(await original<typeof import("../src/api")>()),
  ...api,
}));

let store: Record<Kind, Entity[]>;
let studentUnauthorized: boolean;
let sessionTransportFailure: boolean;
const clients: QueryClient[] = [];
const disposeRouters: (() => void)[] = [];

beforeEach(() => {
  store = structuredClone(records);
  studentUnauthorized = false;
  sessionTransportFailure = false;
  api.request.mockReset();
  api.mutate.mockReset();
  api.login.mockReset();
  window.history.replaceState({}, "", "/");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
  api.request.mockImplementation(readApi);
  api.mutate.mockImplementation(
    async (path: string, method: string, body: Entity) => {
      const [kind, rawId] = path.slice(1).split("/") as [Kind, string];
      if (method !== "PUT") return;
      const index = store[kind].findIndex((row) => row.id === Number(rawId));
      const current = store[kind][index];
      if (current.version !== body.version) {
        throw new ApiError(
          409,
          "Registro alterado. Recarregue antes de salvar.",
        );
      }
      store[kind][index] = {
        ...current,
        ...body,
        version: current.version + 1,
      };
      return structuredClone(store[kind][index]);
    },
  );
  api.login.mockImplementation(async () => {
    studentUnauthorized = false;
  });
});

afterEach(() => {
  for (const dispose of disposeRouters.splice(0)) dispose();
  for (const client of clients.splice(0)) client.clear();
});

async function readApi(path: string) {
  if (path === "/auth/me") {
    if (sessionTransportFailure)
      throw new Error("Falha de transporte ao revalidar sessão");
    return { email: "admin@example.test" };
  }
  if (path === "/dashboard") return structuredClone(dashboard);
  const url = new URL(path, "http://example.test");
  const [kind, rawId] = url.pathname.slice(1).split("/") as [
    Kind,
    string | undefined,
  ];
  if (kind === "students" && rawId === "1" && studentUnauthorized) {
    window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(401, "Autenticação necessária");
  }
  if (rawId)
    return structuredClone(store[kind].find((row) => row.id === Number(rawId)));
  let content = [...(store[kind] ?? [])];
  const q = url.searchParams.get("q");
  if (q)
    content = content.filter((row) =>
      String(row.name ?? (row.student as Entity)?.name)
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  const active = url.searchParams.get("active");
  if (active)
    content = content.filter((row) => row.active === (active === "true"));
  return {
    content: structuredClone(content),
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    number: 0,
    size: 10,
  };
}

function client() {
  const value = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  clients.push(value);
  return value;
}

function routeView(node: React.ReactNode, path: string) {
  const cache = client();
  const router = createMemoryRouter([{ path: "*", element: node }], {
    initialEntries: [path],
  });
  disposeRouters.push(() => router.dispose());
  render(
    <QueryClientProvider client={cache}>
      <FeedbackProvider>
        <RouterProvider router={router} />
      </FeedbackProvider>
    </QueryClientProvider>,
  );
  return cache;
}

function historyView() {
  const cache = client();
  const router = createMemoryRouter(
    [{ path: "/alunos/:id", element: <StudentDetail /> }],
    { initialEntries: ["/alunos/1"] },
  );
  disposeRouters.push(() => router.dispose());
  render(
    <QueryClientProvider client={cache}>
      <FeedbackProvider>
        <RouterProvider router={router} />
      </FeedbackProvider>
    </QueryClientProvider>,
  );
  return cache;
}

function appView(path: string) {
  window.history.replaceState({}, "", path);
  const cache = client();
  render(
    <QueryClientProvider client={cache}>
      <App />
    </QueryClientProvider>,
  );
  return cache;
}

async function editStudent(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: "Ana Teste" });
  await user.click(screen.getByRole("button", { name: "Editar cadastro" }));
  await screen.findByRole("dialog", { name: "Editar aluno" });
  await user.clear(screen.getByLabelText("Telefone", { exact: true }));
  await user.type(
    screen.getByLabelText("Telefone", { exact: true }),
    "11911112222",
  );
}

it("mantém valores e versão da abertura juntos após atualização concorrente do aluno", async () => {
  const user = userEvent.setup();
  const cache = historyView();
  await editStudent(user);
  store.students[0] = {
    ...store.students[0],
    email: "novo-email@example.test",
    version: 1,
  };

  await act(async () => {
    await cache.invalidateQueries({ queryKey: ["students", "1"], exact: true });
  });
  expect(cache.getQueryData<Entity>(["students", "1"])?.version).toBe(1);
  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

  await waitFor(() => {
    expect(store.students[0].email).toBe("novo-email@example.test");
    expect(screen.getByRole("alert")).toHaveTextContent("Registro alterado");
  });
  expect(screen.getByLabelText("Telefone", { exact: true })).toHaveValue(
    "11911112222",
  );
});

it("preserva rascunho do histórico após refetch 401 e reautenticação", async () => {
  let cache!: QueryClient;
  await act(async () => {
    cache = appView("/alunos/1");
  });
  await screen.findByRole("heading", { name: "Ana Teste" });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Editar cadastro" }));
  });
  await screen.findByRole("dialog", { name: "Editar aluno" });
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Telefone", { exact: true }), {
      target: { value: "11911112222" },
    });
  });
  studentUnauthorized = true;
  await act(async () => {
    await cache.invalidateQueries({ queryKey: ["students", "1"], exact: true });
    // Observe the queued query notification before continuing with the modal.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const login = await screen.findByRole("dialog", { name: "Entre novamente" });
  const email = await within(login).findByLabelText("E-mail", { exact: true });
  const password = await within(login).findByLabelText("Senha", {
    exact: true,
  });
  await act(async () => {
    fireEvent.change(email, { target: { value: "admin@example.test" } });
    fireEvent.change(password, { target: { value: "Test-password" } });
  });
  await act(async () => {
    fireEvent.click(
      within(login).getByRole("button", { name: /Entrar na academia/ }),
    );
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Entre novamente" }),
    ).not.toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Telefone", { exact: true })).toHaveValue(
      "11911112222",
    ),
  );
});

it("preserva formulário aberto se a revalidação da sessão falhar por transporte", async () => {
  const user = userEvent.setup();
  const cache = appView("/planos");
  await screen.findByRole("heading", { name: "Planos" });
  await user.click(screen.getByRole("button", { name: "Novo plano" }));
  await user.type(
    screen.getByLabelText("Nome do plano"),
    "Rascunho preservado",
  );
  sessionTransportFailure = true;

  await act(async () => {
    await cache.invalidateQueries({ queryKey: ["session"], exact: true });
    // React Query notifies observers on the next task after the fetch settles.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(cache.getQueryState(["session"])?.status).toBe("error");
  expect(screen.getByLabelText("Nome do plano")).toHaveValue(
    "Rascunho preservado",
  );
});

it("Voltar pede confirmação e cancelar mantém o formulário com suas alterações", async () => {
  const user = userEvent.setup();
  appView("/");
  await screen.findByRole("heading", { name: "Visão geral" });
  await user.click(screen.getByRole("link", { name: "Planos" }));
  await screen.findByRole("heading", { name: "Planos" });
  await user.click(screen.getByRole("button", { name: "Novo plano" }));
  await user.type(
    screen.getByLabelText("Nome do plano"),
    "Plano ainda não salvo",
  );

  await act(async () => window.history.back());

  const confirmation = await screen.findByRole("dialog", {
    name: "Descartar alterações?",
  });
  await user.click(
    within(confirmation).getByRole("button", { name: "Cancelar" }),
  );
  expect(window.location.pathname).toBe("/planos");
  expect(screen.getByLabelText("Nome do plano")).toHaveValue(
    "Plano ainda não salvo",
  );
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

function withAbort<T>(
  pending: Promise<T>,
  signal?: AbortSignal | null,
): Promise<T> {
  if (!signal) return pending;
  return new Promise<T>((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("Consulta cancelada", "AbortError"));
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    pending
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

it("uma resposta de edição antiga não substitui o rascunho já aberto de outro aluno", async () => {
  const user = userEvent.setup();
  store.students.push({
    ...structuredClone(records.students[0]),
    id: 2,
    name: "Bruno Teste",
    email: "bruno@example.test",
  });
  const first = deferred<Entity>();
  api.request.mockImplementation((path: string, options?: RequestInit) => {
    if (path === "/students/1")
      return withAbort(first.promise, options?.signal);
    return readApi(path);
  });
  routeView(<CollectionPage kind="students" />, "/alunos");
  await user.click(
    await screen.findByRole("button", { name: "Editar Ana Teste" }),
  );
  const editBruno = screen.getByRole("button", { name: "Editar Bruno Teste" });
  if (
    editBruno.hasAttribute("disabled") ||
    editBruno.getAttribute("aria-disabled") === "true"
  ) {
    // Disabling competing openings is also a valid way to make this race impossible.
    await act(async () => first.resolve(structuredClone(records.students[0])));
    await screen.findByRole("dialog", { name: "Editar aluno" });
    expect(screen.getByLabelText("Nome completo", { exact: true })).toHaveValue(
      "Ana Teste",
    );
    return;
  }
  await user.click(editBruno);
  await screen.findByRole("dialog", { name: "Editar aluno" });
  await user.clear(screen.getByLabelText("Telefone", { exact: true }));
  await user.type(
    screen.getByLabelText("Telefone", { exact: true }),
    "11922223333",
  );

  await act(async () => first.resolve(structuredClone(records.students[0])));

  expect(screen.getByLabelText("Nome completo", { exact: true })).toHaveValue(
    "Bruno Teste",
  );
  expect(screen.getByLabelText("Telefone", { exact: true })).toHaveValue(
    "11922223333",
  );
});

it("Enter na busca de referência consulta opções sem salvar o cadastro", async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  routeView(
    <EntityForm
      kind="students"
      item={structuredClone(records.students[0])}
      open
      onClose={close}
    />,
    "/alunos",
  );
  const search = screen.getByRole("textbox", { name: "Buscar plano" });
  await user.type(search, "Alternativo");

  await user.keyboard("{Enter}");

  await waitFor(() =>
    expect(
      api.request.mock.calls.some(([path]) =>
        String(path).includes("q=Alternativo"),
      ),
    ).toBe(true),
  );
  expect(api.mutate).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog", { name: "Editar aluno" })).toBeVisible();
});

describe.each(["invoices", "workouts", "assessments"] as const)(
  "ordenação de %s",
  (kind) => {
    it("ordena a coluna anunciada pelo botão e por aria-sort", async () => {
      const user = userEvent.setup();
      routeView(<CollectionPage kind={kind} />, `/${kind}`);
      await screen.findByRole("table");
      const header = screen
        .getAllByRole("columnheader")
        .find((candidate) => within(candidate).queryByRole("button"));
      expect(header).toBeDefined();
      const trigger = within(header!).getByRole("button");
      const column = trigger.textContent?.trim() ?? "";
      const expectedField: Record<string, string> = {
        Aluno: "student.name",
        Ficha: "name",
        Vencimento: "dueDate",
        Data: kind === "workouts" ? "issuedOn" : "assessedOn",
      };
      expect(expectedField[column]).toBeDefined();

      await user.click(trigger);

      await waitFor(() => {
        const requested = api.request.mock.calls
          .map(([path]) => new URL(String(path), "http://example.test"))
          .filter(
            (url) =>
              url.pathname === `/${kind}` &&
              url.searchParams.get("direction") === "desc",
          )
          .at(-1);
        expect(requested).toBeDefined();
        expect(requested!.searchParams.get("sort")).toBe(expectedField[column]);
      });
      expect(header).toHaveAttribute("aria-sort", "descending");
    });
  },
);

it("fechar consulta devolve o foco ao botão que a abriu pelo teclado", async () => {
  const user = userEvent.setup();
  routeView(<CollectionPage kind="plans" />, "/planos");
  const opener = await screen.findByRole("button", {
    name: "Consultar Essencial",
  });
  opener.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("dialog", { name: "Essencial" });

  await user.keyboard("{Escape}");

  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(opener).toHaveFocus());
});
