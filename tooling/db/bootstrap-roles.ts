import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

try {
  process.loadEnvFile(resolve(process.cwd(), ".env"));
} catch (error: unknown) {
  if (!(error instanceof Error) || !("code" in error && error.code === "ENOENT")) throw error;
}

const adminUrl = process.env.DATABASE_ADMIN_URL;
const credentialsFile = process.env.DATABASE_CREDENTIALS_FILE;
if (!adminUrl || !credentialsFile)
  throw new Error("DATABASE_ADMIN_URL and DATABASE_CREDENTIALS_FILE are required");
const admin = new URL(adminUrl);
if (!admin.hostname || !admin.pathname || admin.pathname === "/")
  throw new Error("DATABASE_ADMIN_URL must include a database name");
const databaseName = decodeURIComponent(admin.pathname.slice(1));
const existing = new Map<string, string>();
try {
  const content = await readFile(credentialsFile, "utf8");
  for (const line of content.split("\n")) {
    const separator = line.indexOf("=");
    if (separator > 0) existing.set(line.slice(0, separator), line.slice(separator + 1));
  }
} catch (error: unknown) {
  if (!(error instanceof Error) || !("code" in error && error.code === "ENOENT")) throw error;
}
const passwordFor = (role: "api" | "worker" | "migrator"): string => {
  const supplied = process.env[`DATABASE_${role.toUpperCase()}_PASSWORD`];
  if (supplied) return supplied;
  const saved = existing.get(`DATABASE_${role.toUpperCase()}_URL`);
  if (saved) {
    const parsed = new URL(saved);
    if (parsed.password) return decodeURIComponent(parsed.password);
  }
  return randomBytes(32).toString("base64url");
};
const passwords = {
  api: passwordFor("api"),
  worker: passwordFor("worker"),
  migrator: passwordFor("migrator"),
};
const sql = postgres(adminUrl, { max: 1 });
const quote = (value: string): string => `"${value.replaceAll('"', '""')}"`;
const roles = [
  [
    "starter_owner",
    "NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS",
    null,
  ],
  [
    "starter_migrator",
    "LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS",
    passwords.migrator,
  ],
  [
    "starter_api",
    "LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS",
    passwords.api,
  ],
  [
    "starter_worker",
    "LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS",
    passwords.worker,
  ],
] as const;
for (const [role, attributes, password] of roles) {
  const exists = await sql.unsafe("SELECT 1 FROM pg_roles WHERE rolname = $1::text", [role]);
  if (exists.length === 0) await sql.unsafe(`CREATE ROLE ${quote(role)} ${attributes}`);
  if (password) {
    const rows = await sql.unsafe(
      "SELECT format('ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS', $1, $2) AS statement",
      [role, password],
    );
    const statement = rows[0]?.statement;
    if (typeof statement !== "string") throw new Error("Role password statement was not generated");
    await sql.unsafe(statement);
  }
}
await sql.unsafe(`GRANT ${quote("starter_owner")} TO ${quote("starter_migrator")}`);
await sql.unsafe(
  `GRANT CONNECT ON DATABASE ${quote(databaseName)} TO starter_migrator, starter_api, starter_worker`,
);
await sql.unsafe(`GRANT CREATE ON DATABASE ${quote(databaseName)} TO starter_migrator`);
await sql.unsafe("GRANT CREATE, USAGE ON SCHEMA public TO starter_migrator, starter_owner");
await sql.unsafe("GRANT USAGE ON SCHEMA public TO starter_api, starter_worker");
await sql.unsafe(
  "ALTER DEFAULT PRIVILEGES FOR ROLE starter_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO starter_api, starter_worker",
);
await sql.unsafe(
  "ALTER DEFAULT PRIVILEGES FOR ROLE starter_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO starter_api, starter_worker",
);
const serviceUrl = (role: string, password: string): string => {
  const value = new URL(adminUrl);
  value.username = role;
  value.password = password;
  return value.toString();
};
const output =
  [
    `API_DATABASE_URL=${serviceUrl("starter_api", passwords.api)}`,
    `WORKER_DATABASE_URL=${serviceUrl("starter_worker", passwords.worker)}`,
    `MIGRATOR_DATABASE_URL=${serviceUrl("starter_migrator", passwords.migrator)}`,
    "DATABASE_OWNER_ROLE=starter_owner",
    "DATABASE_WORKER_ROLE=starter_worker",
  ].join("\n") + "\n";
const absolutePath = credentialsFile.startsWith("/")
  ? credentialsFile
  : `${process.cwd()}/${credentialsFile}`;
await mkdir(absolutePath.slice(0, absolutePath.lastIndexOf("/")), { recursive: true, mode: 0o700 });
await writeFile(credentialsFile, output, { mode: 0o600 });
await sql.end({ timeout: 5 });
process.stdout.write(
  "Database roles bootstrapped; credentials written to the protected output file.\n",
);
