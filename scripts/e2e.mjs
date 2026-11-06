import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vite = path.join(root, "node_modules", ".bin", "vite");
const cypress = path.join(root, "node_modules", ".bin", "cypress");
const url = "http://127.0.0.1:4173/";

function run(command, args, { inherit = true, env = process.env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: inherit ? "inherit" : "ignore",
      env,
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Preview server did not start in time.");
}

let server;

try {
  // Cypress runs against the production bundle: the dev server's HMR client
  // makes repeated page loads flaky, and the built bundle is what ships.
  const buildCode = await run(vite, ["build", "--mode", "e2e"], {
    inherit: false,
    env: { ...process.env, VITE_E2E: "1" },
  });
  if (buildCode !== 0) throw new Error("Production build failed.");

  server = spawn(
    vite,
    ["preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  await waitForServer();
  // Electron's window can be occlusion-throttled in some desktop sessions,
  // which starves requestAnimationFrame and makes timing-sensitive specs flaky.
  // CI and local runs can set CYPRESS_BROWSER=chrome for an unthrottled browser.
  const cypressArgs = ["run"];
  if (process.env.CYPRESS_BROWSER) {
    cypressArgs.push("--browser", process.env.CYPRESS_BROWSER);
  }
  process.exitCode = await run(cypress, cypressArgs);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  server?.kill("SIGTERM");
}

process.exit(process.exitCode ?? 0);
