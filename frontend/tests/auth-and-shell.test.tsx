import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../src/App";
import { Login } from "../src/Login";
import { ApiError } from "../src/api";
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
let authenticated = true;
beforeEach(() => {
  authenticated = true;
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
  api.request.mockImplementation(async (path: string) => {
    if (path === "/auth/me") {
      if (!authenticated) throw new ApiError(401, "Autenticação necessária");
      return { email: "admin@example.test" };
    }
    if (path === "/dashboard") return dashboard;
    const [kind, id] = path.slice(1).split(/[/?]/) as [
      keyof typeof records,
      string,
    ];
    if (id && /^\d+$/.test(id)) return records[kind][0];
    return { content: records[kind] ?? [], totalElements: 1, totalPages: 1 };
  });
  api.mutate.mockImplementation(async () => {
    authenticated = false;
  });
  api.login.mockImplementation(async () => {
    authenticated = true;
  });
});
function app() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}
it("navega entre rotas com título e permite sair", async () => {
  const user = userEvent.setup();
  app();
  await screen.findByRole("heading", { name: "Visão geral" });
  await user.click(screen.getByRole("link", { name: "Alunos" }));
  await screen.findByRole("heading", { name: "Alunos" });
  expect(document.title).toBe("Alunos · Cadência");
  await user.click(screen.getByRole("button", { name: "Abrir menu" }));
  expect(screen.getByRole("dialog", { name: "Cadência" })).toBeVisible();
  await user.click(screen.getAllByRole("link", { name: "Planos" }).at(-1)!);
  await screen.findByRole("heading", { name: "Planos" });
  await user.click(screen.getByRole("button", { name: "Sair da conta" }));
  await screen.findByRole("heading", { name: "Bem-vindo de volta" });
});
it("primeiro acesso exige autenticação e retorna à tarefa", async () => {
  authenticated = false;
  const user = userEvent.setup();
  app();
  await screen.findByRole("heading", { name: "Bem-vindo de volta" });
  await user.type(screen.getByLabelText("E-mail"), "admin@example.test");
  await user.type(screen.getByLabelText("Senha"), "Test-password");
  await user.click(screen.getByRole("button", { name: /Entrar na academia/ }));
  await screen.findByRole("heading", { name: "Visão geral" });
});
it("preserva página ao reautenticar e informa falha de logout", async () => {
  const user = userEvent.setup();
  app();
  await screen.findByRole("heading", { name: "Visão geral" });
  api.mutate.mockRejectedValueOnce(new Error("Não foi possível sair"));
  await user.click(screen.getByRole("button", { name: "Sair da conta" }));
  await screen.findByText("Não foi possível sair");
  fireEvent(window, new Event("session-expired"));
  await screen.findByRole("heading", { name: "Sua sessão expirou" });
  await user.type(screen.getByLabelText("E-mail"), "admin@example.test");
  await user.type(screen.getByLabelText("Senha"), "Test-password");
  await user.click(screen.getByRole("button", { name: /Entrar na academia/ }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});
it("apresenta página desconhecida e volta pela navegação", async () => {
  window.history.replaceState({}, "", "/rota-inexistente");
  const user = userEvent.setup();
  app();
  await screen.findByRole("heading", { name: "Página não encontrada" });
  await user.click(screen.getByRole("link", { name: "Voltar à visão geral" }));
  await screen.findByRole("heading", { name: "Visão geral" });
});
it("erro de sessão oferece repetição sem exibir dados", async () => {
  api.request.mockRejectedValueOnce(new Error("Servidor fora do ar"));
  const user = userEvent.setup();
  app();
  await screen.findByText("Servidor fora do ar");
  await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByRole("heading", { name: "Visão geral" });
});
it("login mostra erro de credenciais, permite alternar senha e repetir", async () => {
  const user = userEvent.setup();
  const success = vi.fn();
  api.login
    .mockRejectedValueOnce(new Error("Credenciais inválidas"))
    .mockRejectedValueOnce("falha")
    .mockResolvedValueOnce(undefined);
  render(<Login onSuccess={success} />);
  await user.type(screen.getByLabelText("E-mail"), "admin@example.test");
  await user.type(screen.getByLabelText("Senha"), "Test-password");
  await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
  expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
  await user.click(screen.getByRole("button", { name: /Entrar na academia/ }));
  await screen.findByText("Credenciais inválidas");
  await user.click(screen.getByRole("button", { name: /Entrar na academia/ }));
  await screen.findByText("Não foi possível entrar.");
  await user.click(screen.getByRole("button", { name: /Entrar na academia/ }));
  await waitFor(() => expect(success).toHaveBeenCalled());
});
