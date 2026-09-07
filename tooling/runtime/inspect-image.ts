import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

const argumentsList = process.argv.slice(2);
if (argumentsList[0] === "--") argumentsList.shift();
const image = argumentsList[0];
const application = argumentsList[1] as "web" | "api" | "worker" | "python" | undefined;
if (!image || !/@sha256:[a-f0-9]{64}$/u.test(image))
  throw new Error("runtime:inspect requires an immutable image reference");
const applications = {
  web: { portEnvironment: "PORT", port: 3000 },
  api: { portEnvironment: "PORT", port: 3001 },
  worker: { portEnvironment: "WORKER_PORT", port: 3002 },
  python: { portEnvironment: "PORT", port: 8000 },
} as const;
if (!application || !(application in applications))
  throw new Error("runtime:inspect requires web, api, worker, or python");
const applicationConfiguration = applications[application];
const docker = (args: readonly string[]) => {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `docker ${args[0] ?? "command"} failed with exit code ${result.status ?? 1}: ${result.stderr.trim()}`,
    );
  return result.stdout;
};
type ContainerState = {
  readonly Status?: string;
  readonly ExitCode?: number;
  readonly OOMKilled?: boolean;
  readonly Health?: { readonly Status?: string };
};
const containerName = [
  "thaarei-runtime",
  application,
  String(process.pid),
  String(Date.now()),
].join("-");
const inspectContainer = (): ContainerState => {
  const inspectedContainer = JSON.parse(docker(["container", "inspect", containerName])) as Array<{
    State?: ContainerState;
  }>;
  const state = inspectedContainer[0]?.State;
  if (!state) throw new Error("Docker did not return container state");
  return state;
};
const waitForHealthy = async (): Promise<ContainerState> => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const state = inspectContainer();
    if (state.Health?.Status === "healthy") return state;
    if (state.Status === "exited" || state.Health?.Status === "unhealthy") {
      throw new Error(
        `Runtime application failed before readiness: ${docker(["logs", "--tail", "100", containerName]).trim()}`,
      );
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error("Runtime application did not become healthy before the qualification timeout");
};

docker(["pull", image]);
const inspected = JSON.parse(docker(["image", "inspect", image])) as Array<{
  Id?: string;
  Config?: {
    User?: string;
    Healthcheck?: unknown;
    Labels?: Record<string, string>;
    Entrypoint?: string[] | null;
    Env?: string[];
  };
}>;
const configuration = inspected[0]?.Config;
if (!configuration) throw new Error("Docker did not return image configuration");
if (!configuration.User || ["0", "root", "0:0", "root:root"].includes(configuration.User))
  throw new Error("Runtime image must declare a non-root user");
if (!configuration.Healthcheck) throw new Error("Runtime image must declare a health check");
for (const label of [
  "org.opencontainers.image.source",
  "org.opencontainers.image.version",
  "org.opencontainers.image.revision",
]) {
  if (!configuration.Labels?.[label])
    throw new Error(`Runtime image is missing OCI label ${label}`);
}
const nodeExecutable = configuration.Env?.some(
  (entry) => entry.startsWith("PATH=") && entry.includes("/nodejs/bin"),
)
  ? "/nodejs/bin/node"
  : "/usr/local/bin/node";
const files = docker([
  "run",
  "--rm",
  "--entrypoint",
  nodeExecutable,
  image,
  "-e",
  `const fs=require("node:fs");const path=require("node:path");const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(full==="/app/node_modules"){continue;}if(entry.isDirectory()){walk(full);}else if(entry.isFile()){console.log(full);}}};walk("/app");`,
]);
const forbidden = files
  .split("\n")
  .filter((path) =>
    /(?:^|\/)(?:\.git|\.env|\.npmrc|src)(?:\/|$)|\.(?:ts|tsx|py)$|credentials?/iu.test(path),
  );
if (forbidden.length > 0)
  throw new Error(`Runtime image contains forbidden files: ${forbidden.join(", ")}`);
let containerCreated = false;
try {
  const environmentFiles = [".env", ".artifacts/database-credentials.env"]
    .filter(existsSync)
    .flatMap((path) => ["--env-file", path]);
  docker([
    "run",
    "--detach",
    "--name",
    containerName,
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=67108864",
    "--network",
    "host",
    ...environmentFiles,
    "--env",
    "APP_ENV=ci",
    "--env",
    "NODE_ENV=production",
    "--env",
    `${applicationConfiguration.portEnvironment}=${applicationConfiguration.port}`,
    image,
  ]);
  containerCreated = true;
  await waitForHealthy();
  docker(["stop", "--signal", "SIGTERM", "--time", "20", containerName]);
  const stopped = inspectContainer();
  if (stopped.OOMKilled || ![0, 143].includes(stopped.ExitCode ?? -1)) {
    throw new Error(
      `Runtime application did not terminate gracefully; exit code ${stopped.ExitCode ?? "unknown"}`,
    );
  }
  const evidence = {
    schemaVersion: 1,
    gate: "runtime-image-inspection",
    result: "passed",
    observedAt: new Date().toISOString(),
    image,
    imageId: inspected[0]?.Id ?? null,
    application,
    user: configuration.User,
    exitCode: stopped.ExitCode,
    contentListDigest: `sha256:${createHash("sha256").update(files).digest("hex")}`,
    controls: [
      "non-root",
      "healthcheck",
      "oci-labels",
      "read-only",
      "drop-all-capabilities",
      "no-new-privileges",
      "content-denylist",
      "declared-entrypoint",
      "healthy",
      "graceful-sigterm",
    ],
  };
  await mkdir(".artifacts/runtime", { recursive: true });
  await writeFile(".artifacts/runtime/image.json", `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write("Runtime image inspection passed\n");
} finally {
  if (containerCreated) spawnSync("docker", ["rm", "--force", containerName], { stdio: "ignore" });
}
