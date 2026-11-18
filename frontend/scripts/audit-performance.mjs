import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import fs from "node:fs/promises";
const context = await chromium.launchPersistentContext(
  "/tmp/academia-lighthouse-profile",
  { headless: true, args: ["--remote-debugging-port=9223", "--no-sandbox"] },
);
const state = JSON.parse(
  await fs.readFile(
    process.env.E2E_AUTH_STATE ?? "/tmp/academia-auth.json",
    "utf8",
  ),
);
await context.addCookies(state.cookies);
const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const reports = [];
try {
  for (const [route, label] of [
    ["/", "dashboard"],
    ["/alunos", "alunos"],
  ]) {
    const cdp = await context.newCDPSession(context.pages()[0]);
    await cdp.send("Network.clearBrowserCache");
    await cdp.detach();
    const result = await lighthouse(base + route, {
      port: 9223,
      disableStorageReset: true,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices"],
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });
    const lhr = result.lhr;
    await fs.writeFile(
      `/home/academia/operations-private/lighthouse-${label}.json`,
      result.report,
    );
    reports.push({
      page: label,
      url: lhr.finalDisplayedUrl,
      fetchTime: lhr.fetchTime,
      lighthouseVersion: lhr.lighthouseVersion,
      scores: Object.fromEntries(
        Object.entries(lhr.categories).map(([k, v]) => [
          k,
          Math.round(v.score * 100),
        ]),
      ),
      metrics: Object.fromEntries(
        [
          "first-contentful-paint",
          "largest-contentful-paint",
          "cumulative-layout-shift",
          "speed-index",
          "total-blocking-time",
          "interactive",
          "total-byte-weight",
          "network-requests",
        ]
          .filter((k) => lhr.audits[k])
          .map((k) => [
            k,
            {
              value: lhr.audits[k].numericValue,
              unit: lhr.audits[k].numericUnit,
              display: lhr.audits[k].displayValue,
            },
          ]),
      ),
      findings: Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 0.9)
        .map((a) => ({
          id: a.id,
          title: a.title,
          score: a.score,
          display: a.displayValue,
        })),
    });
  }
  await fs.writeFile(
    "../docs/evidence/lighthouse.json",
    JSON.stringify(reports, null, 2),
  );
  console.log(JSON.stringify(reports));
} finally {
  await context.close();
}
