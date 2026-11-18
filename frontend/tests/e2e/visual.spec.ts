import { test, expect } from "@playwright/test";
import path from "node:path";
const pages = [
  ["/", "dashboard"],
  ["/alunos", "alunos"],
  ["/planos", "planos"],
  ["/professores", "professores"],
  ["/mensalidades", "mensalidades"],
  ["/treinos", "treinos"],
  ["/avaliacoes", "avaliacoes"],
  ["/alunos/1001", "historico"],
];
for (const [width, height] of [
  [360, 800],
  [390, 844],
  [768, 1024],
  [1366, 768],
  [1920, 1080],
]) {
  test(`regressão visual em ${width} × ${height}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    const serverErrors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 500)
        serverErrors.push(
          `${response.status()} ${new URL(response.url()).pathname}`,
        );
    });
    for (const [route, name] of pages) {
      await page.goto(route);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page).toHaveScreenshot(`${name}-${width}.png`, {
        fullPage: true,
        animations: "disabled",
        stylePath: path.resolve("tests/e2e/visual.css"),
        maxDiffPixelRatio: 0.002,
      });
    }
    expect(errors).toEqual([]);
    expect(serverErrors).toEqual([]);
  });
  test(`login em ${width} × ${height}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height },
      storageState: { cookies: [], origins: [] },
      locale: "pt-BR",
    });
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL!);
    await page.getByLabel("E-mail", { exact: true }).waitFor();
    await expect(page).toHaveScreenshot(`login-${width}.png`, {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.002,
    });
    await context.close();
  });
}
