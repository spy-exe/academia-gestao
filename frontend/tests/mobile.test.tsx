import { beforeEach, it, expect, vi, describe } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CollectionPage } from "../src/CollectionPage";
import { StudentDetail } from "../src/StudentDetail";
import { FeedbackProvider, Modal } from "../src/ui";
import { modules } from "../src/registry";
import type { Kind } from "../src/domain";
import { records } from "./fixtures";
const api = vi.hoisted(() => ({ request: vi.fn(), mutate: vi.fn() }));
vi.mock("../src/api", async (original) => ({
  ...(await original<typeof import("../src/api")>()),
  ...api,
}));
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  api.request.mockReset();
  api.mutate.mockReset();
  api.request.mockImplementation(async (path: string) => {
    const url = new URL(path, "http://example.test");
    const [kind, id] = url.pathname.slice(1).split("/") as [
      Kind,
      string | undefined,
    ];
    return id
      ? structuredClone(records[kind][0])
      : {
          content: structuredClone(records[kind]),
          totalElements: 1,
          totalPages: 1,
        };
  });
});
function view(node: React.ReactNode, path = "/") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>
      </FeedbackProvider>
    </QueryClientProvider>,
  );
}
describe.each(Object.keys(modules) as Kind[])("mobile %s", (kind) => {
  it("exibe todos os dados e ações sem depender de rolagem lateral", async () => {
    const user = userEvent.setup();
    view(<CollectionPage kind={kind} />);
    const list = await screen.findByRole("list", { name: modules[kind].title });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const row = within(list).getByRole("listitem");
    if (kind === "students")
      expect(
        within(row).getByRole("link", { name: "Histórico de Ana Teste" }),
      ).toHaveAttribute("href", "/alunos/1");
    else {
      await user.click(
        within(row).getByRole("button", {
          name: `Consultar ${records[kind][0].name ?? modules[kind].singular}`,
        }),
      );
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Fechar consulta" }));
    }
    if (kind === "invoices") {
      await user.click(
        screen.getByRole("button", {
          name: "Registrar pagamento de Ana Teste",
        }),
      );
      expect(screen.getByRole("dialog")).toHaveClass("compact-dialog");
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
    } else {
      await user.click(
        screen.getByRole("button", {
          name: `Editar ${records[kind][0].name ?? modules[kind].singular}`,
        }),
      );
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
    }
    await user.click(
      screen.getByRole("button", { name: modules[kind].action }),
    );
    expect(screen.getByRole("dialog")).toHaveClass("default-dialog");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(api.mutate).not.toHaveBeenCalled();
  });
});
it("histórico móvel alterna módulos e mantém as medidas acessíveis", async () => {
  const user = userEvent.setup();
  view(
    <Routes>
      <Route path="/alunos/:id" element={<StudentDetail />} />
    </Routes>,
    "/alunos/1",
  );
  const group = await screen.findByRole("group", {
    name: "Selecionar histórico",
  });
  await screen.findByRole("list", { name: "Mensalidades" });
  expect(
    screen.queryByRole("list", { name: "Treinos" }),
  ).not.toBeInTheDocument();
  await user.click(within(group).getByRole("button", { name: "Treinos" }));
  await screen.findByRole("list", { name: "Treinos" });
  await user.click(within(group).getByRole("button", { name: "Avaliações" }));
  await screen.findByRole("list", { name: "Avaliações" });
  expect(screen.getByText("24,69")).toBeVisible();
  expect(screen.getByText("Último registro")).toBeVisible();
});
it("modal acompanha a área visível quando o teclado reduz o viewport", async () => {
  const viewport = new EventTarget();
  Object.assign(viewport, { height: 400, offsetTop: 0 });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: viewport,
  });
  view(
    <Modal open title="Cadastro" onClose={vi.fn()}>
      <div className="dialog-body">Formulário</div>
    </Modal>,
  );
  viewport.dispatchEvent(new Event("resize"));
  await waitFor(() =>
    expect(
      screen.getByRole("dialog").style.getPropertyValue("--visual-height"),
    ).toBe("400px"),
  );
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: undefined,
  });
});

it("ordenação móvel usa o mesmo contrato da tabela", async () => {
  const user = userEvent.setup();
  view(<CollectionPage kind="students" />);
  await screen.findByRole("list", { name: "Alunos" });
  await user.click(
    screen.getByRole("button", { name: "Ordenar por nome: crescente" }),
  );
  await waitFor(() =>
    expect(
      api.request.mock.calls.some(([path]) =>
        String(path).includes("direction=desc"),
      ),
    ).toBe(true),
  );
  expect(
    screen.getByRole("button", { name: "Ordenar por nome: decrescente" }),
  ).toBeVisible();
});
