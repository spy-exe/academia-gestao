import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
export async function restartApplication() {
  if (process.env.E2E_RUNTIME === "systemd") {
    execFileSync(
      "sudo",
      ["systemctl", "restart", "postgresql", "academia-demo", "nginx"],
      { timeout: 45000 },
    );
  } else if (process.env.E2E_RUNTIME === "process") {
    const pid = Number(await fs.readFile("/tmp/academia-backend.pid", "utf8"));
    process.kill(pid, "SIGTERM");
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        try {
          process.kill(pid, 0);
        } catch {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 10000);
    });
    const child = spawn(
      "java",
      ["-jar", path.resolve("../backend/target/academia-gestao-1.0.0.jar")],
      { env: process.env, detached: true, stdio: "ignore" },
    );
    child.unref();
    if (!child.pid) throw new Error("Não foi possível reiniciar a API.");
    await fs.writeFile("/tmp/academia-backend.pid", String(child.pid));
  } else
    throw new Error(
      "Defina E2E_RUNTIME como systemd ou process para verificar o reinício real.",
    );
}
