import postgres from "postgres";

const ids = {
  subjectA: "p1-proof-subject-a",
  subjectB: "p1-proof-subject-b",
  organizationA: "p1-proof-organization-a",
  organizationB: "p1-proof-organization-b",
  membershipA: "p1-proof-membership-a",
  membershipB: "p1-proof-membership-b",
  auditA: "p1-proof-audit-a",
  auditB: "p1-proof-audit-b",
} as const;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const admin = postgres(requiredEnvironment("ADMIN_DATABASE_URL"), { max: 1 });
const api = postgres(requiredEnvironment("API_DATABASE_URL"), { max: 1 });
const worker = postgres(requiredEnvironment("WORKER_DATABASE_URL"), { max: 1 });

async function cleanup(): Promise<void> {
  await admin.unsafe("DELETE FROM authorization_audit_events WHERE id = ANY($1::text[])", [
    [ids.auditA, ids.auditB],
  ]);
  await admin.unsafe("DELETE FROM memberships WHERE id = ANY($1::text[])", [
    [ids.membershipA, ids.membershipB],
  ]);
  await admin.unsafe("DELETE FROM organizations WHERE id = ANY($1::text[])", [
    [ids.organizationA, ids.organizationB],
  ]);
  await admin.unsafe("DELETE FROM application_users WHERE id = ANY($1::text[])", [
    [ids.subjectA, ids.subjectB],
  ]);
}

async function seed(): Promise<void> {
  await cleanup();
  await admin.begin(async (transaction) => {
    await transaction.unsafe(
      "INSERT INTO application_users (id, authentication_subject_id) VALUES ($1, $2), ($3, $4)",
      [ids.subjectA, "p1-proof-auth-a", ids.subjectB, "p1-proof-auth-b"],
    );
    await transaction.unsafe(
      "INSERT INTO organizations (id, name, created_by_subject_id) VALUES ($1, $2, $3), ($4, $5, $6)",
      [
        ids.organizationA,
        "P1 Proof Alpha",
        ids.subjectA,
        ids.organizationB,
        "P1 Proof Beta",
        ids.subjectB,
      ],
    );
    await transaction.unsafe(
      "INSERT INTO memberships (id, user_id, organization_id, status) VALUES ($1, $2, $3, 'active'), ($4, $5, $6, 'active')",
      [
        ids.membershipA,
        ids.subjectA,
        ids.organizationA,
        ids.membershipB,
        ids.subjectB,
        ids.organizationB,
      ],
    );
    await transaction.unsafe(
      "INSERT INTO authorization_audit_events (id, organization_id, actor_subject_id, action, resource_type, outcome, correlation_id) VALUES ($1, $2, $3, 'p1.proof', 'foundation', 'allowed', $4), ($5, $6, $7, 'p1.proof', 'foundation', 'allowed', $8)",
      [
        ids.auditA,
        ids.organizationA,
        ids.subjectA,
        "p1-proof-correlation-a",
        ids.auditB,
        ids.organizationB,
        ids.subjectB,
        "p1-proof-correlation-b",
      ],
    );
  });
}

async function tenantRows(
  connection: ReturnType<typeof postgres>,
  organizationId: string,
  subjectId: string,
): Promise<readonly string[]> {
  return connection.begin(async (transaction) => {
    await transaction.unsafe(
      "SELECT set_config('app.organization_id', $1, true), set_config('app.subject_id', $2, true)",
      [organizationId, subjectId],
    );
    const rows = await transaction.unsafe("SELECT id FROM authorization_audit_events ORDER BY id");
    return rows.map((row) => String(row.id));
  }) as Promise<readonly string[]>;
}

async function visibleOrganizations(subjectId: string): Promise<readonly string[]> {
  return api.begin(async (transaction) => {
    await transaction.unsafe(
      "SELECT set_config('app.organization_id', '', true), set_config('app.subject_id', $1, true)",
      [subjectId],
    );
    const rows = await transaction.unsafe("SELECT id FROM organizations ORDER BY id");
    return rows.map((row) => String(row.id));
  }) as Promise<readonly string[]>;
}

async function assertRuntimeCannotCreate(
  connection: ReturnType<typeof postgres>,
  tableName: string,
): Promise<string> {
  try {
    await connection.unsafe(`CREATE TABLE public.${tableName} (id text PRIMARY KEY)`);
  } catch (error: unknown) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "unknown";
    assert(code === "42501", `${tableName} failed with unexpected SQLSTATE ${code}`);
    return code;
  }
  await admin.unsafe(`DROP TABLE IF EXISTS public.${tableName}`);
  throw new Error(`${tableName} was unexpectedly created by a runtime role`);
}

try {
  const roleRows = await admin.unsafe(
    "SELECT rolname, rolsuper, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname",
    [["starter_api", "starter_migrator", "starter_owner", "starter_worker"]],
  );
  assert(roleRows.length === 4, "P1 database roles are incomplete");
  for (const row of roleRows) {
    assert(row.rolsuper === false, `${row.rolname} must not be superuser`);
    assert(row.rolbypassrls === false, `${row.rolname} must not bypass RLS`);
    if (row.rolname === "starter_owner") assert(row.rolcanlogin === false, "owner must be NOLOGIN");
  }

  const tableRows = await admin.unsafe(
    "SELECT c.relname, pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) ORDER BY c.relname",
    [["organizations", "memberships", "authorization_audit_events", "outbox_events"]],
  );
  assert(tableRows.length === 4, "P1 tenant table catalog is incomplete");
  for (const row of tableRows) {
    assert(row.owner === "starter_owner", `${row.relname} has the wrong owner`);
    assert(row.relrowsecurity === true, `${row.relname} does not enable RLS`);
    assert(row.relforcerowsecurity === true, `${row.relname} does not force RLS`);
  }

  await seed();
  const apiRows = await tenantRows(api, ids.organizationA, ids.subjectA);
  const workerRows = await tenantRows(worker, ids.organizationB, ids.subjectB);
  const organizations = await visibleOrganizations(ids.subjectA);
  assert(apiRows.length === 1 && apiRows[0] === ids.auditA, "API role crossed tenant boundary");
  assert(
    workerRows.length === 1 && workerRows[0] === ids.auditB,
    "worker role crossed tenant boundary",
  );
  assert(
    organizations.length === 1 && organizations[0] === ids.organizationA,
    "subject-scoped organization discovery crossed membership boundary",
  );

  const apiCreateSqlState = await assertRuntimeCannotCreate(api, "p1_api_must_not_create");
  const workerCreateSqlState = await assertRuntimeCannotCreate(worker, "p1_worker_must_not_create");
  process.stdout.write(
    `${JSON.stringify({
      roles: roleRows.map((row) => ({
        name: row.rolname,
        login: row.rolcanlogin,
        superuser: row.rolsuper,
        bypassRls: row.rolbypassrls,
      })),
      tenantTables: tableRows.map((row) => ({
        name: row.relname,
        owner: row.owner,
        rls: row.relrowsecurity,
        forcedRls: row.relforcerowsecurity,
      })),
      isolation: { apiRows, workerRows, organizations },
      createDeniedSqlState: { api: apiCreateSqlState, worker: workerCreateSqlState },
    })}\n`,
  );
} finally {
  await cleanup();
  await Promise.all([
    admin.end({ timeout: 5 }),
    api.end({ timeout: 5 }),
    worker.end({ timeout: 5 }),
  ]);
}
