import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch();
const results = [];
for (const width of [360, 390, 768, 1366, 1920]) {
  const context = await browser.newContext({
    viewport: {
      width,
      height: width === 360 ? 800 : width === 390 ? 844 : 1024,
    },
    storageState: process.env.E2E_AUTH_STATE ?? "/tmp/academia-auth.json",
    locale: "pt-BR",
  });
  const page = await context.newPage();
  for (const [path, label, action] of [
    ["/", "dashboard"],
    ["/alunos", "alunos", "Novo aluno"],
    ["/planos", "planos", "Novo plano"],
    ["/professores", "professores", "Novo professor"],
    ["/mensalidades", "mensalidades", "Gerar mensalidade"],
    ["/treinos", "treinos", "Nova ficha"],
    ["/avaliacoes", "avaliacoes", "Nova avaliação"],
    ["/alunos/1001", "historico"],
  ]) {
    await page.goto(base + path);
    await page.waitForLoadState("networkidle");
    for (const form of action ? [false, true] : [false]) {
      if (form)
        await page.getByRole("button", { name: action, exact: true }).click();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      results.push({
        page: label,
        width,
        form,
        violations: audit.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        passes: audit.passes.length,
      });
      if (form) {
        await page
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
      }
    }
  }
  await context.close();
}
const anonymous = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await anonymous.newPage();
await page.goto(base);
await page.getByLabel("E-mail", { exact: true }).waitFor();
const loginAudit = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  .analyze();
results.push({
  page: "login",
  width: 390,
  violations: loginAudit.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  })),
});
await browser.close();
await fs.writeFile(
  "../docs/evidence/accessibility.json",
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify({
    audits: results.length,
    violations: results.filter((r) => r.violations.length),
  }),
);
if (results.some((r) => r.violations.length)) process.exitCode = 1;
