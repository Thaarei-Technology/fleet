import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { runMigrations as runGraphileWorkerMigrations } from "graphile-worker";

try {
  process.loadEnvFile(resolve(process.cwd(), ".env"));
} catch (error: unknown) {
  if (!(error instanceof Error) || !("code" in error && error.code === "ENOENT")) throw error;
}
const appEnvironment = process.env.APP_ENV ?? "local";
const migratorUrl = process.env.MIGRATOR_DATABASE_URL;
if (appEnvironment !== "local" && !migratorUrl)
  throw new Error("MIGRATOR_DATABASE_URL is required outside local development");
const databaseUrl = migratorUrl ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("MIGRATOR_DATABASE_URL or local DATABASE_URL is required");
const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");
const sql = postgres(databaseUrl, { max: 1 });
const checksum = (content: string): string => createHash("sha256").update(content).digest("hex");
const migrationName = (name: string): boolean => /^\d{4}_[a-z0-9-]+\.sql$/u.test(name);
const quoteIdentifier = (identifier: string): string => `"${identifier.replaceAll('"', '""')}"`;

/**
 * Keep tenant table ownership on the inactive NOLOGIN owner role. Migrations
 * connect as the separate migrator role, so this also protects future tenant
 * tables without requiring each migration author to remember the transfer.
 */
async function transferTenantTableOwnership(transaction: postgres.TransactionSql): Promise<void> {
  const rows = await transaction.unsafe(
    `SELECT c.relname AS table_name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND (
          c.relname = 'organizations'
          OR EXISTS (
            SELECT 1
              FROM pg_attribute a
             WHERE a.attrelid = c.oid
               AND a.attname = 'organization_id'
               AND a.attnum > 0
               AND NOT a.attisdropped
          )
        )
        AND pg_get_userbyid(c.relowner) = current_user
      ORDER BY c.relname`,
  );
  for (const row of rows) {
    if (typeof row.table_name !== "string" || !row.table_name)
      throw new Error("Tenant table catalog row is invalid");
    await transaction.unsafe(
      `ALTER TABLE public.${quoteIdentifier(row.table_name)} OWNER TO starter_owner`,
    );
  }
}

try {
  await sql.unsafe("SET lock_timeout = '15s'");
  await sql.unsafe("SET statement_timeout = '5min'");
  await sql.unsafe("SELECT pg_advisory_lock(hashtextextended('thaarei:starter:migrations', 0))");
  await sql.unsafe(
    "CREATE TABLE IF NOT EXISTS thaarei_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const appliedRows = await sql.unsafe(
    "SELECT name, checksum FROM thaarei_migrations ORDER BY name",
  );
  const applied = new Map<string, string>();
  for (const row of appliedRows) {
    if (typeof row.name !== "string" || typeof row.checksum !== "string")
      throw new Error("Migration ledger row is invalid");
    applied.set(row.name, row.checksum);
  }
  const files = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
  const invalidName = files.find((name) => !migrationName(name));
  if (invalidName) throw new Error(`Invalid numbered migration filename: ${invalidName}`);
  const missingFile = [...applied.keys()].find((name) => !files.includes(name));
  if (missingFile) throw new Error(`Applied migration file is missing: ${missingFile}`);
  for (const name of files) {
    const startedAt = performance.now();
    const content = await readFile(join(migrationsDirectory, name), "utf8");
    const digest = checksum(content);
    const previous = applied.get(name);
    if (previous) {
      if (previous !== digest) throw new Error(`Migration checksum changed: ${name}`);
      process.stdout.write(`Skipping unchanged migration ${name}\n`);
      continue;
    }
    await sql.begin(async (transaction) => {
      await transaction.unsafe(content);
      await transferTenantTableOwnership(transaction);
      await transaction.unsafe("INSERT INTO thaarei_migrations (name, checksum) VALUES ($1, $2)", [
        name,
        digest,
      ]);
    });
    process.stdout.write(
      `{"migration":"${name}","digest":"sha256:${digest}","durationMs":${Math.round(performance.now() - startedAt)}}\n`,
    );
  }
  const workerMigrationStartedAt = performance.now();
  await runGraphileWorkerMigrations({ connectionString: databaseUrl });
  await sql.unsafe("GRANT USAGE ON SCHEMA graphile_worker TO starter_worker");
  await sql.unsafe(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO starter_worker",
  );
  await sql.unsafe(
    "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA graphile_worker TO starter_worker",
  );
  await sql.unsafe("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker TO starter_worker");
  await sql.unsafe(`
    DO $$
    DECLARE
      table_name text;
    BEGIN
      FOR table_name IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'graphile_worker'
           AND c.relkind IN ('r', 'p')
           AND c.relrowsecurity
         ORDER BY c.relname
      LOOP
        EXECUTE format(
          'DROP POLICY IF EXISTS starter_worker_runtime ON graphile_worker.%I',
          table_name
        );
        EXECUTE format(
          'CREATE POLICY starter_worker_runtime ON graphile_worker.%I TO starter_worker USING (true) WITH CHECK (true)',
          table_name
        );
      END LOOP;
    END
    $$
  `);
  process.stdout.write(
    `{"migration":"graphile-worker@0.17.3","durationMs":${Math.round(performance.now() - workerMigrationStartedAt)}}\n`,
  );
  process.stdout.write(
    files.length === applied.size
      ? "No migrations to apply (second run is a no-op)\n"
      : "Migration run complete\n",
  );
} finally {
  try {
    await sql.unsafe(
      "SELECT pg_advisory_unlock(hashtextextended('thaarei:starter:migrations', 0))",
    );
  } catch {}
  await sql.end({ timeout: 5 });
}
