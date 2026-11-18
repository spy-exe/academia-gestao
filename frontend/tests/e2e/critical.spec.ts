import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import { restartApplication } from "./runtime";
const currency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
async function navigate(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
async function selectReference(page: Page, label: string, name: string) {
  const select = page.getByLabel(label, { exact: true });
  await expect(select.locator("option").filter({ hasText: name })).toHaveCount(
    1,
  );
  await select.selectOption({ label: name });
}
async function save(page: Page, kind: string, label = "Salvar cadastro") {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/api/${kind}` &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: label, exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return result.json();
}
test("fluxo completo de gestão com persistência real", async ({ page }) => {
  test.setTimeout(180000);
  const run = Date.now().toString();
  const studentName = `E2E Aluno ${run}`;
  const planName = `E2E Plano ${run}`;
  const teacherName = `E2E Professor ${run}`;
  const workoutName = `E2E Ficha ${run}`;
  await navigate(page, "/alunos");
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill(studentName);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`e2e.${run}@example.test`);
  await page.getByLabel("Telefone", { exact: true }).fill("11999990000");
  await page.getByLabel("Nascimento", { exact: true }).fill("2000-01-01");
  await page.getByLabel("Matrícula", { exact: true }).fill("2026-01-01");
  const student = await save(page, "students");
  await navigate(page, "/planos");
  await page.getByRole("button", { name: "Novo plano", exact: true }).click();
  await page.getByLabel("Nome do plano", { exact: true }).fill(planName);
  await page.getByLabel("Valor (R$)", { exact: true }).fill("149.90");
  await page.getByLabel("Periodicidade", { exact: true }).selectOption("1");
  await page
    .getByLabel("Benefícios", { exact: true })
    .fill("Musculação e orientação");
  const plan = await save(page, "plans");
  await navigate(page, "/alunos");
  await page
    .getByRole("button", { name: `Editar ${studentName}`, exact: true })
    .click();
  await selectReference(page, "Plano", planName);
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: studentName }),
  ).toContainText(planName);
  await navigate(page, "/mensalidades");
  await page
    .getByRole("button", { name: "Gerar mensalidade", exact: true })
    .click();
  await selectReference(page, "Aluno", studentName);
  await page.getByLabel("Competência", { exact: true }).fill("2026-01");
  await page.getByLabel("Vencimento", { exact: true }).fill("2026-01-10");
  const invoice = await save(page, "invoices", "Gerar mensalidade");
  await page
    .getByRole("button", { name: "Gerar mensalidade", exact: true })
    .click();
  await selectReference(page, "Aluno", studentName);
  await page.getByLabel("Competência", { exact: true }).fill("2026-01");
  await page.getByLabel("Vencimento", { exact: true }).fill("2026-01-10");
  const duplicate = await save(page, "invoices", "Gerar mensalidade");
  expect(duplicate.id).toBe(invoice.id);
  await navigate(page, "/");
  const before = await page
    .getByText("Receita no mês", { exact: true })
    .locator("..")
    .locator("..")
    .locator("strong")
    .innerText();
  const revenueBefore = Number(
    before.replace(/[^\d,-]/g, "").replace(",", "."),
  );
  await navigate(page, "/mensalidades");
  await page
    .getByRole("button", {
      name: `Registrar pagamento de ${studentName}`,
      exact: true,
    })
    .click();
  await expect(page.getByText(/Nenhuma transação bancária/)).toBeVisible();
  await page
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: studentName }),
  ).toContainText("Paga");
  await navigate(page, "/");
  await expect(
    page
      .getByText("Receita no mês", { exact: true })
      .locator("..")
      .locator("..")
      .locator("strong"),
  ).toHaveText(currency(revenueBefore + 149.9));
  await navigate(page, "/professores");
  await page
    .getByRole("button", { name: "Novo professor", exact: true })
    .click();
  await page.getByLabel("Nome completo", { exact: true }).fill(teacherName);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`prof.${run}@example.test`);
  await page.getByLabel("Telefone", { exact: true }).fill("11988880000");
  await page
    .getByLabel("Especialidades", { exact: true })
    .fill("Força e condicionamento");
  const teacher = await save(page, "teachers");
  await navigate(page, "/treinos");
  await page.getByRole("button", { name: "Nova ficha", exact: true }).click();
  await page.getByLabel("Nome da ficha", { exact: true }).fill(workoutName);
  await selectReference(page, "Aluno", studentName);
  await selectReference(page, "Professor responsável", teacherName);
  await page.getByLabel("Data da ficha", { exact: true }).fill("2026-01-02");
  await page
    .getByRole("button", { name: "Adicionar exercício", exact: true })
    .click();
  await page.getByLabel("Exercício", { exact: true }).fill("Agachamento");
  await page
    .getByRole("button", { name: "Adicionar exercício", exact: true })
    .click();
  await page.getByLabel("Exercício", { exact: true }).nth(1).fill("Remada");
  await page
    .getByRole("button", { name: "Subir exercício 2", exact: true })
    .click();
  const workout = await save(page, "workouts");
  await page.reload();
  await page
    .getByRole("button", { name: `Editar ${workoutName}`, exact: true })
    .click();
  await expect(
    page.getByLabel("Exercício", { exact: true }).first(),
  ).toHaveValue("Remada");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  const assessments = [];
  for (const [day, weight] of [
    ["2026-01-03", "80"],
    ["2026-02-03", "79"],
  ]) {
    await navigate(page, "/avaliacoes");
    await page
      .getByRole("button", { name: "Nova avaliação", exact: true })
      .click();
    await selectReference(page, "Aluno", studentName);
    await page.getByLabel("Data da avaliação", { exact: true }).fill(day);
    await page.getByLabel("Peso (kg)", { exact: true }).fill(weight);
    await page.getByLabel("Altura (cm)", { exact: true }).fill("180");
    await page.getByLabel("Cintura (cm, opcional)", { exact: true }).fill("85");
    assessments.push(await save(page, "assessments"));
  }
  await navigate(page, `/alunos/${student.id}`);
  await expect(
    page.getByRole("heading", { name: studentName, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Evolução de Peso/ }),
  ).toBeVisible();
  await expect(page.getByText(workoutName, { exact: true })).toBeVisible();
  await expect(page.getByText("24.69", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Editar cadastro", exact: true })
    .click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill(studentName + " atualizado");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: studentName + " atualizado",
      exact: true,
    }),
  ).toBeVisible();
  await navigate(page, "/alunos");
  await page
    .getByRole("button", {
      name: `Arquivar ${studentName} atualizado`,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Arquivar", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: studentName }),
  ).toContainText("Arquivado");
  await restartApplication();
  await expect
    .poll(
      async () => {
        try {
          const response = await page.request.get("/api/auth/csrf");
          return response.ok() && (await response.json()).token ? 200 : 0;
        } catch {
          return 0;
        }
      },
      { timeout: 40000 },
    )
    .toBe(200);
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /Entrar na academia/ }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.context().storageState({
    path: process.env.E2E_AUTH_STATE ?? "/tmp/academia-auth.json",
  });
  await navigate(page, `/alunos/${student.id}`);
  await expect(
    page.getByRole("heading", {
      name: studentName + " atualizado",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();
  await expect(page.getByText(workoutName, { exact: true })).toBeVisible();
  await expect(page.getByText("Paga", { exact: true })).toBeVisible();
  await fs.writeFile(
    test.info().outputPath("resources.json"),
    JSON.stringify({
      student: student.id,
      plan: plan.id,
      teacher: teacher.id,
      workout: workout.id,
      invoice: invoice.id,
      assessments: assessments.map((a) => a.id),
    }),
  );
});
test("dados administrativos não são públicos e entradas inválidas são identificadas", async ({
  page,
  browser,
}) => {
  const anonymous = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  expect(
    (
      await anonymous.request.get(
        `${test.info().project.use.baseURL}/api/students`,
      )
    ).status(),
  ).toBe(401);
  expect(
    (
      await anonymous.request.post(
        `${test.info().project.use.baseURL}/api/students`,
        { data: { name: "sem sessão" } },
      )
    ).status(),
  ).toBe(403);
  await anonymous.close();
  await navigate(page, "/alunos");
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar cadastro", exact: true })
    .click();
  await expect(
    page.getByText("Informe este campo.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome completo", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
});
