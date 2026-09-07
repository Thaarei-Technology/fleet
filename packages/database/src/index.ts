import postgres from "postgres";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  bigint,
  boolean,
  index,
  pgTable,
  jsonb,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  AssuranceLevel,
  IdentityRepository,
  WorkflowStore,
  OutboxPort,
  OutboxDeliveryPort,
} from "@thaarei/core";
import { validateDomainEvent } from "@thaarei/core";

/**
 * SOURCE OF TRUTH ID: starter.database.schema
 * SOURCE OF TRUTH KEYWORDS: database, drizzle, postgres, schema, workflow
 *
 * WHAT: Persistence schema, readiness, and repositories for selected capabilities.
 * WHY: Durable state and provider sessions need one explicit persistence owner.
 * WHEN: Use for migrations, repositories, idempotency, and operational readiness.
 * HOW: createDatabaseRuntime, workflowRuns
 * BOUNDARIES: Apps compose this package; core and adapters must not import its driver directly.
 */
export const starterHealth = pgTable("starter_health", { id: text("id").primaryKey() });

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const authSession = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);
export const authAccount = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("account_issuer_account_id_idx").on(table.issuer, table.accountId),
    index("account_user_id_idx").on(table.userId),
  ],
);
export const authVerification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
export const authTwoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  verified: boolean("verified").default(false).notNull(),
  failedVerificationCount: integer("failed_verification_count").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});
export const authPasskey = pgTable("passkey", {
  id: text("id").primaryKey(),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  credentialID: text("credential_id").notNull().unique(),
  counter: integer("counter").notNull(),
  deviceType: text("device_type").notNull(),
  backedUp: boolean("backed_up").notNull(),
  transports: text("transports"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  aaguid: text("aaguid"),
});
export const authSchema = {
  user: authUser,
  session: authSession,
  account: authAccount,
  verification: authVerification,
  twoFactor: authTwoFactor,
  passkey: authPasskey,
};
export const applicationUsers = pgTable("application_users", {
  id: text("id").primaryKey(),
  authenticationSubjectId: text("authentication_subject_id").notNull().unique(),
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBySubjectId: text("created_by_subject_id").notNull(),
});
export const memberships = pgTable("memberships", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),
  status: text("status").notNull(),
});
export const governanceRoleAssignments = pgTable("governance_role_assignments", {
  id: text("id").primaryKey(),
  membershipId: text("membership_id").notNull(),
  organizationId: text("organization_id").notNull(),
  role: text("role").notNull(),
});
export const productRoleAssignments = pgTable("product_role_assignments", {
  id: text("id").primaryKey(),
  membershipId: text("membership_id").notNull(),
  organizationId: text("organization_id").notNull(),
  role: text("role").notNull(),
});
export const permissionDefinitions = pgTable("permission_definitions", {
  id: text("id").primaryKey(),
  permission: text("permission").notNull().unique(),
});
export const permissionGrants = pgTable("permission_grants", {
  id: text("id").primaryKey(),
  membershipId: text("membership_id").notNull(),
  organizationId: text("organization_id").notNull(),
  permissionId: text("permission_id").notNull(),
});
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const authorizationAuditEvents = pgTable("authorization_audit_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  actorSubjectId: text("actor_subject_id").notNull(),
  action: text("action").notNull(),
  outcome: text("outcome").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workflowRuns = pgTable("workflow_runs", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  status: text("status").notNull(),
  claimToken: text("claim_token").notNull(),
  claimExpiresAt: timestamp("claim_expires_at", { withTimezone: true }).notNull(),
});

export const outboxEvents = pgTable("outbox_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  type: text("type").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  payload: jsonb("payload").notNull(),
  destination: text("destination").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull(),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
  attemptCount: integer("attempt_count").notNull(),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  fencingToken: bigint("fencing_token", { mode: "number" }).notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id"),
});
export const outboxDeliveryAttempts = pgTable("outbox_delivery_attempts", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  fencingToken: bigint("fencing_token", { mode: "number" }).notNull(),
  outcome: text("outcome").notNull(),
  normalizedFailure: text("normalized_failure"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const outboxDeadLetters = pgTable("outbox_dead_letters", {
  eventId: text("event_id").primaryKey(),
  organizationId: text("organization_id"),
  reason: text("reason").notNull(),
  replayedBySubjectId: text("replayed_by_subject_id"),
  replayedAt: timestamp("replayed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const inboxReceipts = pgTable("inbox_receipts", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  consumer: text("consumer").notNull(),
  eventId: text("event_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

export interface OrganizationSummary {
  readonly id: string;
  readonly name: string;
}

export interface DatabaseRuntime {
  readonly checkReadiness: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly withOrganizationContext: <T>(
    organizationId: string,
    subjectId: string,
    callback: (transaction: postgres.TransactionSql) => Promise<T>,
  ) => Promise<T>;

  readonly organization: {
    readonly hasMembership: (subjectId: string, organizationId: string) => Promise<boolean>;
    readonly listOrganizations: (subjectId: string) => Promise<readonly OrganizationSummary[]>;
  };

  readonly outbox: OutboxPort & OutboxDeliveryPort;

  readonly authentication: {
    readonly database: ReturnType<typeof drizzle>;
    readonly schema: typeof authSchema;
    readonly recordAssurance: (sessionToken: string, assurance: AssuranceLevel) => Promise<void>;
    readonly resolveAssurance: (
      sessionToken: string,
    ) => Promise<{ readonly assurance: AssuranceLevel; readonly authenticatedAt: string } | null>;
  };
  readonly identity: IdentityRepository;
  readonly workflow: WorkflowStore;
}
export function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  return value;
}

export function createInMemoryWorkflowStore(): WorkflowStore {
  const claims = new Map<
    string,
    {
      readonly status: "running" | "complete";
      readonly claimToken: string;
      readonly claimExpiresAt: Date;
    }
  >();
  return {
    begin: async (key, claimToken, now, leaseExpiresAt) => {
      const claim = claims.get(key);
      if (
        claim?.status === "complete" ||
        (claim?.status === "running" && claim.claimExpiresAt > now)
      )
        return false;
      claims.set(key, { status: "running", claimToken, claimExpiresAt: leaseExpiresAt });
      return true;
    },
    complete: async (key, claimToken) => {
      const claim = claims.get(key);
      if (claim?.claimToken === claimToken) claims.set(key, { ...claim, status: "complete" });
    },
    fail: async (key, claimToken) => {
      if (claims.get(key)?.claimToken === claimToken) claims.delete(key);
    },
  };
}

export async function withOrganizationContext<T>(
  sql: ReturnType<typeof postgres>,
  organizationId: string,
  subjectId: string,
  callback: (transaction: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  if (!organizationId || !subjectId)
    throw new Error("Tenant context requires organization and subject");
  const result = await sql.begin(async (transaction) => {
    await transaction.unsafe(
      "SELECT set_config('app.organization_id', $1, true), set_config('app.subject_id', $2, true)",
      [organizationId, subjectId],
    );
    return callback(transaction);
  });
  return result as unknown as T;
}

export async function withSubjectContext<T>(
  sql: ReturnType<typeof postgres>,
  subjectId: string,
  callback: (transaction: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  if (!subjectId) throw new Error("Subject context requires a subject");
  const result = await sql.begin(async (transaction) => {
    await transaction.unsafe(
      "SELECT set_config('app.organization_id', '', true), set_config('app.subject_id', $1, true)",
      [subjectId],
    );
    return callback(transaction);
  });
  return result as unknown as T;
}

function safeDatabaseInteger(value: unknown, field: string): number {
  const parsed = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isSafeInteger(parsed) || parsed < 0)
    throw new Error(`Database field ${field} is not a non-negative safe integer`);
  return parsed;
}

function databaseTimestamp(value: unknown, field: string): string {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(parsed.getTime()))
    throw new Error(`Database field ${field} is not a timestamp`);
  return parsed.toISOString();
}

export function createDatabaseRuntime(url = databaseUrl()): DatabaseRuntime {
  const sql = postgres(url, { max: 2 });

  const organization = {
    hasMembership: async (subjectId: string, organizationId: string): Promise<boolean> => {
      return withOrganizationContext(sql, organizationId, subjectId, async (transaction) => {
        const rows = await transaction.unsafe(
          "SELECT 1 FROM memberships WHERE user_id = $1 AND organization_id = $2 AND status = 'active' LIMIT 1",
          [subjectId, organizationId],
        );
        return rows.length > 0;
      });
    },
    listOrganizations: async (subjectId: string): Promise<readonly OrganizationSummary[]> => {
      return withSubjectContext(sql, subjectId, async (transaction) => {
        const rows = await transaction.unsafe(
          "SELECT organizations.id, organizations.name FROM organizations JOIN memberships ON memberships.organization_id = organizations.id WHERE memberships.user_id = $1 AND memberships.status = 'active' ORDER BY organizations.name ASC, organizations.id ASC",
          [subjectId],
        );
        return rows.map((row) => {
          if (typeof row.id !== "string" || typeof row.name !== "string")
            throw new Error("Organization catalog row is invalid");
          return { id: row.id, name: row.name };
        });
      });
    },
  };

  const authentication = {
    database: drizzle(sql, { schema: authSchema }),
    schema: authSchema,
    recordAssurance: async (sessionToken: string, assurance: AssuranceLevel) => {
      await sql.unsafe(
        "INSERT INTO authentication_assurance (session_token, assurance, authenticated_at) VALUES ($1, $2, now()) ON CONFLICT (session_token) DO UPDATE SET assurance = EXCLUDED.assurance, authenticated_at = EXCLUDED.authenticated_at",
        [sessionToken, assurance],
      );
    },
    resolveAssurance: async (sessionToken: string) => {
      const rows = await sql.unsafe(
        "SELECT assurance, authenticated_at FROM authentication_assurance WHERE session_token = $1",
        [sessionToken],
      );
      const row = rows[0];
      return row && typeof row.assurance === "string" && row.authenticated_at instanceof Date
        ? {
            assurance: row.assurance as AssuranceLevel,
            authenticatedAt: row.authenticated_at.toISOString(),
          }
        : null;
    },
  };
  const identityDatabase = drizzle(sql, { schema: { applicationUsers } });

  const identity: IdentityRepository = {
    ensureAuthenticationSubject: async (authenticationSubjectId) => {
      const existing = await identityDatabase
        .select()
        .from(applicationUsers)
        .where(eq(applicationUsers.authenticationSubjectId, authenticationSubjectId))
        .limit(1);
      if (existing[0]) return { subjectId: existing[0].id };
      const inserted = await identityDatabase
        .insert(applicationUsers)
        .values({ id: crypto.randomUUID(), authenticationSubjectId })
        .onConflictDoNothing()
        .returning({ id: applicationUsers.id });
      if (inserted[0]) return { subjectId: inserted[0].id };
      const concurrent = await identityDatabase
        .select()
        .from(applicationUsers)
        .where(eq(applicationUsers.authenticationSubjectId, authenticationSubjectId))
        .limit(1);
      if (!concurrent[0]) throw new Error("Failed to map authentication subject");
      return { subjectId: concurrent[0].id };
    },
    resolveAuthenticationSubject: async (authenticationSubjectId) => {
      const rows = await identityDatabase
        .select()
        .from(applicationUsers)
        .where(eq(applicationUsers.authenticationSubjectId, authenticationSubjectId))
        .limit(1);
      const row = rows[0];
      return row ? { subjectId: row.id } : null;
    },
  };

  const workflow: WorkflowStore = {
    begin: async (key, claimToken, now, leaseExpiresAt) => {
      const rows = await sql.unsafe(
        "INSERT INTO workflow_runs (idempotency_key, status, claim_token, claim_expires_at) VALUES ($1, 'running', $2, $3) ON CONFLICT (idempotency_key) DO UPDATE SET status = 'running', claim_token = EXCLUDED.claim_token, claim_expires_at = EXCLUDED.claim_expires_at WHERE workflow_runs.status <> 'complete' AND workflow_runs.claim_expires_at <= $4 RETURNING idempotency_key",
        [key, claimToken, leaseExpiresAt.toISOString(), now.toISOString()],
      );
      return rows.length > 0;
    },
    complete: async (key, claimToken) => {
      await sql.unsafe(
        "UPDATE workflow_runs SET status = 'complete' WHERE idempotency_key = $1 AND claim_token = $2",
        [key, claimToken],
      );
    },
    fail: async (key, claimToken) => {
      await sql.unsafe(
        "DELETE FROM workflow_runs WHERE idempotency_key = $1 AND claim_token = $2 AND status = 'running'",
        [key, claimToken],
      );
    },
  };

  const outbox: OutboxPort & OutboxDeliveryPort = {
    append: async (event, destination, idempotencyKey) => {
      await sql.unsafe(
        "INSERT INTO outbox_events (id, organization_id, type, schema_version, aggregate_type, aggregate_id, payload, destination, idempotency_key, status, available_at, attempt_count, fencing_token, correlation_id, causation_id, occurred_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available', now(), 0, 0, $10, $11, $12) ON CONFLICT (destination, idempotency_key) DO NOTHING",
        [
          event.id,
          event.organizationId ?? null,
          event.type,
          event.schemaVersion,
          event.aggregateType,
          event.aggregateId,
          JSON.stringify(event.payload),
          destination,
          idempotencyKey,
          event.correlationId,
          event.causationId ?? null,
          event.occurredAt,
        ],
      );
    },
    claim: async (eventId, leaseOwner, now, leaseMilliseconds) => {
      const rows = await sql.unsafe(
        "UPDATE outbox_events SET status = 'processing', lease_owner = $2, lease_expires_at = $3, fencing_token = fencing_token + 1, attempt_count = attempt_count + 1 WHERE id = $1 AND (status = 'available' OR (status = 'processing' AND lease_expires_at <= $4)) RETURNING fencing_token, attempt_count, destination, organization_id, type, schema_version, aggregate_type, aggregate_id, payload, correlation_id, causation_id, occurred_at",
        [
          eventId,
          leaseOwner,
          new Date(now.getTime() + leaseMilliseconds).toISOString(),
          now.toISOString(),
        ],
      );
      const row = rows[0];
      if (!row) return null;
      const event = validateDomainEvent({
        id: eventId,
        ...(typeof row.organization_id === "string" ? { organizationId: row.organization_id } : {}),
        type: row.type,
        schemaVersion: row.schema_version,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        payload: row.payload,
        occurredAt: databaseTimestamp(row.occurred_at, "occurred_at"),
        correlationId: row.correlation_id,
        ...(typeof row.causation_id === "string" ? { causationId: row.causation_id } : {}),
      });
      if (typeof row.destination !== "string")
        throw new Error("Claimed outbox metadata is invalid");
      return {
        fencingToken: safeDatabaseInteger(row.fencing_token, "fencing_token"),
        attemptNumber: safeDatabaseInteger(row.attempt_count, "attempt_count"),
        destination: row.destination,
        event,
      };
    },
    recordAttempt: async (eventId, fencingToken, outcome, failure) => {
      await sql.unsafe(
        "INSERT INTO outbox_delivery_attempts (id, event_id, attempt_number, fencing_token, outcome, normalized_failure) SELECT $1, id, attempt_count, $2, $3, $4 FROM outbox_events WHERE id = $5 AND fencing_token = $2 ON CONFLICT (event_id, attempt_number) DO NOTHING",
        [crypto.randomUUID(), fencingToken, outcome, failure ?? null, eventId],
      );
    },
    markDelivered: async (eventId, fencingToken) => {
      await sql.unsafe(
        "UPDATE outbox_events SET status = 'delivered', lease_owner = NULL, lease_expires_at = NULL WHERE id = $1 AND status = 'processing' AND fencing_token = $2",
        [eventId, fencingToken],
      );
    },
    replay: async (eventId, actorSubjectId) => {
      await sql.unsafe(
        "UPDATE outbox_events SET status = 'available', available_at = now(), lease_owner = NULL, lease_expires_at = NULL, last_failure = NULL WHERE id = $1 AND status = 'dead_letter'",
        [eventId],
      );
      await sql.unsafe(
        "UPDATE outbox_dead_letters SET replayed_by_subject_id = $2, replayed_at = now() WHERE event_id = $1",
        [eventId, actorSubjectId],
      );
    },
  };

  return {
    checkReadiness: async () => {
      await sql.unsafe("SELECT 1");
    },
    close: async () => {
      await sql.end({ timeout: 5 });
    },
    withOrganizationContext: (organizationId, subjectId, callback) =>
      withOrganizationContext(sql, organizationId, subjectId, callback),
    organization,
    authentication,
    identity,
    workflow,
    outbox,
  };
}
