import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch();
const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  storageState: process.env.E2E_AUTH_STATE ?? "/tmp/academia-auth.json",
});
const page = await context.newPage();
const states = [];
async function capture(label) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `../docs/evidence/mobile-${label}.png`,
    animations: "disabled",
  });
  states.push({
    state: label,
    width: 390,
    height: 844,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  });
}
for (const [path, label, action] of [
  ["/alunos", "aluno", "Novo aluno"],
  ["/planos", "plano", "Novo plano"],
  ["/professores", "professor", "Novo professor"],
  ["/mensalidades", "mensalidade", "Gerar mensalidade"],
  ["/treinos", "treino", "Nova ficha"],
  ["/avaliacoes", "avaliacao", "Nova avaliação"],
]) {
  await page.goto(base + path);
  await page.getByRole("button", { name: action, exact: true }).click();
  await capture(`form-${label}`);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
}
await page.goto(base + "/alunos?q=nenhum-registro-com-este-termo");
await page
  .getByRole("heading", { name: "Nenhum registro por aqui", exact: true })
  .waitFor();
await capture("vazio");
await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
await page
  .getByRole("button", { name: "Salvar cadastro", exact: true })
  .click();
await page.getByText("Informe este campo.", { exact: true }).waitFor();
await capture("validacao");
await page.getByRole("button", { name: "Cancelar", exact: true }).click();
await page.goto(base + "/alunos");
await page.waitForLoadState("networkidle");
await page.route("**/api/students?**", (route) =>
  route.abort("connectionrefused"),
);
await page.getByLabel("Pesquisar alunos", { exact: true }).fill("offline");
await page
  .getByRole("button", { name: "Tentar novamente", exact: true })
  .waitFor();
await capture("erro-conexao");
await page.unrouteAll({ behavior: "wait" });
await page
  .getByRole("button", { name: "Tentar novamente", exact: true })
  .click();
await page.waitForLoadState("networkidle");
let release;
const pending = new Promise((resolve) => {
  release = resolve;
});
await page.route("**/api/students?**", async (route) => {
  const response = await route.fetch();
  await pending;
  await route.fulfill({ response });
});
await page.goto(base + "/alunos?q=carregamento-lento");
await page.getByRole("heading", { name: "Alunos", exact: true }).waitFor();
await page
  .getByRole("status")
  .filter({ hasText: "Carregando dados…" })
  .first()
  .waitFor();
await capture("carregando");
release();
await page.unrouteAll({ behavior: "wait" });
await page.goto(base + "/");
await page.getByRole("button", { name: "Mais opções", exact: true }).click();
await capture("navegacao");
await browser.close();
await fs.writeFile(
  "../docs/evidence/mobile-states.json",
  JSON.stringify(states, null, 2),
);
console.log(JSON.stringify(states));
