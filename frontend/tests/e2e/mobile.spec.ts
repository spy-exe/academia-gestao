import { test, expect } from "@playwright/test";

test("gestão no celular: criar, pesquisar, editar, arquivar e consultar histórico", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const name = `Mobile ${Date.now()}`;
  await page.goto("/alunos");
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds?.width).toBe(390);
  await page.getByLabel("Nome completo", { exact: true }).fill(name);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`mobile.${Date.now()}@example.test`);
  await page.getByLabel("Telefone", { exact: true }).fill("11955554444");
  await page.getByLabel("Nascimento", { exact: true }).fill("2000-01-01");
  await page.getByLabel("Matrícula", { exact: true }).fill("2026-01-01");
  const created = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/students" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar cadastro", exact: true })
    .click();
  expect((await created).status()).toBe(201);
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Pesquisar alunos", { exact: true }).fill(name);
  await expect(
    page.getByRole("list", { name: "Alunos", exact: true }).locator("li"),
  ).toHaveCount(1);
  await page.reload();
  await page
    .getByRole("button", { name: `Editar ${name}`, exact: true })
    .click();
  await page.getByLabel("Telefone", { exact: true }).fill("11955554444");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("11955554444", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: `Arquivar ${name}`, exact: true })
    .click();
  const archived = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" && r.url().includes("/api/students/"),
  );
  await page.getByRole("button", { name: "Arquivar", exact: true }).click();
  expect((await archived).status()).toBe(204);
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: `Histórico de ${name}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  for (const section of ["Treinos", "Avaliações", "Mensalidades"]) {
    await page.getByRole("button", { name: section, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: section, exact: true }),
    ).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("ações e formulários de todos os módulos cabem em 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, action] of [
    ["/alunos", "Novo aluno"],
    ["/planos", "Novo plano"],
    ["/professores", "Novo professor"],
    ["/mensalidades", "Gerar mensalidade"],
    ["/treinos", "Nova ficha"],
    ["/avaliacoes", "Nova avaliação"],
  ]) {
    await page.goto(path);
    await page.getByRole("button", { name: action, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Cancelar", exact: true }),
    ).toBeInViewport();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Mais opções", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Planos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Planos", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("rotação do celular preserva uma ficha ainda não salva", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/alunos/1001");
  await page.getByRole("button", { name: "Treinos", exact: true }).click();
  await page.getByRole("button", { name: "Nova ficha", exact: true }).click();
  await page
    .getByLabel("Nome da ficha", { exact: true })
    .fill("Ficha em preenchimento");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByLabel("Nome da ficha", { exact: true })).toHaveValue(
    "Ficha em preenchimento",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Nome da ficha", { exact: true })).toHaveValue(
    "Ficha em preenchimento",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("formulário mantém ações acessíveis com viewport baixo e movimento reduzido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto("/alunos");
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Salvar cadastro", exact: true }),
  ).toBeInViewport();
  await expect(
    dialog.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeInViewport();
  await page.getByLabel("Plano", { exact: true }).focus();
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  const duration = await dialog.evaluate((el) =>
    Number.parseFloat(getComputedStyle(el).animationDuration),
  );
  expect(duration).toBeLessThanOrEqual(0.01);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Novo aluno", exact: true }),
  ).toBeFocused();
});
