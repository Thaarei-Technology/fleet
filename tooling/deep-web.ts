import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

const children: ChildProcess[] = [];
const start = (args: readonly string[], environment: NodeJS.ProcessEnv): ChildProcess => {
  const child = spawn("pnpm", args, {
    stdio: "inherit",
    env: environment,
    detached: process.platform !== "win32",
  });
  children.push(child);
  return child;
};
const waitFor = async (url: string, child: ChildProcess): Promise<void> => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Process for ${url} exited before readiness`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
};
const run = (
  script: string,
  args: readonly string[] = [],
  environment: NodeJS.ProcessEnv = process.env,
): void => {
  const result = spawnSync("pnpm", [script, ...args], { stdio: "inherit", env: environment });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed with exit code ${result.status ?? 1}`);
};
const availablePort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Failed to allocate a deep-validation port");
  await new Promise<void>((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
  return address.port;
};

try {
  const apiPort = await availablePort();
  const webPort = await availablePort();
  const webEnvironment = { ...process.env, API_INTERNAL_URL: `http://127.0.0.1:${apiPort}` };
  run("--filter", ["@thaarei/web-app", "build"], webEnvironment);
  const api = start(["dev:api"], {
    ...process.env,
    PORT: String(apiPort),
    ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}`,
    BETTER_AUTH_URL: `http://127.0.0.1:${webPort}`,
  });
  const web = start(
    ["--filter", "@thaarei/web-app", "exec", "next", "start", "-p", String(webPort)],
    webEnvironment,
  );
  await Promise.all([
    waitFor(`http://127.0.0.1:${apiPort}/health/ready`, api),
    waitFor(`http://127.0.0.1:${webPort}`, web),
  ]);
  run("test:e2e", [], {
    ...process.env,
    E2E_API_PORT: String(apiPort),
    E2E_WEB_PORT: String(webPort),
    PLAYWRIGHT_REUSE_SERVER: "true",
  });
  run("test:performance", ["--", `http://127.0.0.1:${apiPort}`]);
  run("security:dast", ["--", `http://127.0.0.1:${webPort}`]);
} finally {
  for (const child of children) {
    if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  }
}
