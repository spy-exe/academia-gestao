import { test, expect } from "@playwright/test";
test("todas as rotas consultam dados reais e não apresentam overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [path, title] of [
    ["/", "Visão geral"],
    ["/alunos", "Alunos"],
    ["/planos", "Planos"],
    ["/professores", "Professores"],
    ["/mensalidades", "Mensalidades"],
    ["/treinos", "Treinos"],
    ["/avaliacoes", "Avaliações"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Carregando dados…")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("tabelas permanecem dentro do viewport móvel", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/alunos");
  await expect(
    page.getByRole("heading", { name: "Alunos", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
