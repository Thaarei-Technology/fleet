import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const image =
  "postgres:18.3-bookworm@sha256:80630f83606d8db77d30b3851b16a9f78be2d0d4dda6f7b82a1fdca5ebe3acba";
const suffix = `${process.pid}-${Date.now()}`;
const source = `thaarei-recovery-source-${suffix}`;
const restored = `thaarei-recovery-restored-${suffix}`;
const password = randomUUID();

const docker = (args: readonly string[], input?: string | Uint8Array, tolerateFailure = false) => {
  const result = spawnSync("docker", args, {
    input,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  if (!tolerateFailure && result.status !== 0) {
    const detail = String(result.stderr ?? "").trim();
    throw new Error(
      `docker ${args[0] ?? "command"} failed with exit code ${result.status ?? 1}${detail ? `: ${detail}` : ""}`,
    );
  }
  return result;
};
const startDatabase = (name: string): void => {
  docker([
    "run",
    "--detach",
    "--name",
    name,
    "--env",
    `POSTGRES_PASSWORD=${password}`,
    "--env",
    "POSTGRES_DB=starter",
    image,
  ]);
};
const waitForDatabase = async (name: string): Promise<void> => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (
      docker(
        ["exec", name, "pg_isready", "--username", "postgres", "--dbname", "starter"],
        undefined,
        true,
      ).status === 0
    )
      return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`PostgreSQL container ${name} did not become ready`);
};

try {
  startDatabase(source);
  await waitForDatabase(source);
  const migrationDirectory = resolve("packages/database/migrations");
  const migrationNames = (await readdir(migrationDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (migrationNames.length === 0) throw new Error("No reviewed SQL migrations were found");
  const migrations: Array<{ name: string; digest: string }> = [];
  for (const name of migrationNames) {
    const sql = await readFile(resolve(migrationDirectory, name));
    migrations.push({ name, digest: `sha256:${createHash("sha256").update(sql).digest("hex")}` });
    docker(
      [
        "exec",
        "--interactive",
        source,
        "psql",
        "--set",
        "ON_ERROR_STOP=1",
        "--username",
        "postgres",
        "--dbname",
        "starter",
      ],
      sql,
    );
  }
  const marker = randomUUID();
  docker([
    "exec",
    source,
    "psql",
    "--set",
    "ON_ERROR_STOP=1",
    "--username",
    "postgres",
    "--dbname",
    "starter",
    "--command",
    "INSERT INTO starter_health (id) VALUES ('" + marker + "')",
  ]);
  const dump = docker([
    "exec",
    source,
    "pg_dump",
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--username",
    "postgres",
    "--dbname",
    "starter",
  ]).stdout;
  if (!(dump instanceof Uint8Array) || dump.byteLength === 0)
    throw new Error("PostgreSQL backup was empty");
  startDatabase(restored);
  await waitForDatabase(restored);
  docker(
    [
      "exec",
      "--interactive",
      restored,
      "pg_restore",
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      "--username",
      "postgres",
      "--dbname",
      "starter",
    ],
    dump,
  );
  const verification = docker([
    "exec",
    restored,
    "psql",
    "--tuples-only",
    "--no-align",
    "--username",
    "postgres",
    "--dbname",
    "starter",
    "--command",
    "SELECT id FROM starter_health WHERE id = '" + marker + "'",
  ]).stdout;
  if (String(verification).trim() !== marker)
    throw new Error("Restored database marker did not match");
  const recipe = JSON.parse(await readFile(".thaarei/starter.json", "utf8")) as {
    generatorVersion?: string;
    recipeHash?: string;
    generatedTreeHash?: string;
  };
  if (!recipe.recipeHash?.match(/^sha256:[a-f0-9]{64}$/u))
    throw new Error("Starter recipe hash is missing or invalid");
  const evidence = {
    schemaVersion: 1,
    gate: "postgresql-restore",
    result: "passed",
    observedAt: new Date().toISOString(),
    image,
    generatorVersion: recipe.generatorVersion ?? null,
    recipeHash: recipe.recipeHash,
    generatedTreeHash: recipe.generatedTreeHash ?? null,
    migrations,
    backupBytes: dump.byteLength,
    markerDigest: `sha256:${createHash("sha256").update(marker).digest("hex")}`,
  };
  await mkdir(".artifacts/recovery", { recursive: true });
  await writeFile(".artifacts/recovery/postgresql.json", `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write("PostgreSQL backup and restore verification passed\n");
} finally {
  docker(["rm", "--force", source], undefined, true);
  docker(["rm", "--force", restored], undefined, true);
}
