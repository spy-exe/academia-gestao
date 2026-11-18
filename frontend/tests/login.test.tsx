import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { Login } from "../src/Login";
vi.mock("../src/api", () => ({ login: vi.fn() }));
it("identifica entradas inválidas e permite mostrar a senha", async () => {
  const user = userEvent.setup();
  render(<Login onSuccess={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: /Entrar na academia/ }));
  expect(await screen.findByText("Informe um e-mail válido.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
  expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
});
