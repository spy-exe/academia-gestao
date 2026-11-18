import { it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Modal,
  Confirm,
  Badge,
  FeedbackProvider,
  useFeedback,
  Empty,
  Failure,
  Loading,
} from "../src/ui";
it("botões expõem processamento e impedem ativação duplicada", async () => {
  const click = vi.fn();
  const user = userEvent.setup();
  render(
    <Button busy onClick={click}>
      Salvar
    </Button>,
  );
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  await user.click(screen.getByRole("button"));
  expect(click).not.toHaveBeenCalled();
});
it("modal fecha por Escape e possui descrição padrão", async () => {
  const close = vi.fn();
  const user = userEvent.setup();
  render(
    <Modal open onClose={close} title="Editar cadastro">
      <p>Dados</p>
    </Modal>,
  );
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Editar cadastro");
  expect(
    screen.getByText("Preencha os dados e salve para concluir."),
  ).toBeVisible();
  await user.keyboard("{Escape}");
  expect(close).toHaveBeenCalled();
});
it("confirmação comunica erro e protege fechamento durante a operação", async () => {
  const close = vi.fn();
  const save = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(
    <Confirm
      open
      title="Arquivar aluno?"
      text="O histórico será mantido."
      onClose={close}
      onConfirm={save}
      busy
      error="Não foi possível arquivar"
    />,
  );
  await user.keyboard("{Escape}");
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Não foi possível arquivar",
  );
  rerender(
    <Confirm
      open
      title="Arquivar aluno?"
      text="O histórico será mantido."
      onClose={close}
      onConfirm={save}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Arquivar" }));
  expect(save).toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Fechar" }));
  expect(close).toHaveBeenCalled();
});
it("feedback usa região viva e pode ser dispensado", async () => {
  function Send() {
    const notify = useFeedback();
    return <button onClick={() => notify("Alterações salvas")}>Salvar</button>;
  }
  const user = userEvent.setup();
  render(
    <FeedbackProvider>
      <Send />
    </FeedbackProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(screen.getByRole("status")).toHaveTextContent("Alterações salvas");
  await user.click(screen.getByRole("button", { name: "Fechar notificação" }));
  await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
});
it("estados reutilizados preservam significado textual", async () => {
  const retry = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(<Loading />);
  expect(screen.getByRole("status")).toHaveTextContent("Carregando dados");
  rerender(<Empty />);
  expect(
    screen.getByText("Adicione o primeiro registro para começar."),
  ).toBeVisible();
  rerender(<Failure error={new Error("Falha")} retry={retry} />);
  await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(retry).toHaveBeenCalled();
  rerender(
    <>
      <Badge value="Ativo" />
      <Badge value="Paga" />
      <Badge value="Vencida" />
      <Badge value="Arquivado" />
    </>,
  );
  expect(screen.getByText("Vencida")).toHaveClass("danger");
  expect(screen.getByText("Arquivado")).toHaveClass("neutral");
});
