import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createDatabaseRuntime } from "../src/index.js";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const connectionString = requiredEnvironment("WORKER_DATABASE_URL");
const sql = postgres(connectionString, { max: 1 });
const database = createDatabaseRuntime(connectionString);
const eventId = randomUUID();
const requestId = randomUUID();
const workflowKeys = [`outbox:${eventId}`, `foundation-probe:${requestId}`] as const;

async function cleanup(): Promise<void> {
  await sql.unsafe("DELETE FROM outbox_events WHERE id = $1", [eventId]);
  await sql.unsafe("DELETE FROM workflow_runs WHERE idempotency_key = ANY($1::text[])", [
    workflowKeys,
  ]);
}

async function waitForCompletion(): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const workflowRows = await sql.unsafe(
      "SELECT idempotency_key, status FROM workflow_runs WHERE idempotency_key = ANY($1::text[]) ORDER BY idempotency_key",
      [workflowKeys],
    );
    const eventRows = await sql.unsafe(
      "SELECT status FROM outbox_events WHERE id = $1 AND status = 'delivered'",
      [eventId],
    );
    if (
      workflowRows.length === 2 &&
      workflowRows.every((row) => row.status === "complete") &&
      eventRows.length === 1
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the P1 worker and outbox proof");
}

try {
  await cleanup();
  await database.outbox.append(
    {
      id: eventId,
      type: "fleet.foundation.probe.requested.v1",
      schemaVersion: 1,
      aggregateType: "foundation-probe",
      aggregateId: requestId,
      payload: { requestId },
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
    },
    "internal",
    `p1-proof:${requestId}`,
  );
  await sql.unsafe("SELECT graphile_worker.add_job($1, $2::json)", [
    "thaarei_fleet.outbox.dispatch",
    { eventId, leaseOwner: "p1-foundation-proof" },
  ]);
  await waitForCompletion();

  const eventRows = await sql.unsafe(
    "SELECT status, attempt_count, fencing_token FROM outbox_events WHERE id = $1",
    [eventId],
  );
  const attemptRows = await sql.unsafe(
    "SELECT outcome, normalized_failure FROM outbox_delivery_attempts WHERE event_id = $1 ORDER BY attempt_number",
    [eventId],
  );
  const workflowRows = await sql.unsafe(
    "SELECT idempotency_key, status FROM workflow_runs WHERE idempotency_key = ANY($1::text[]) ORDER BY idempotency_key",
    [workflowKeys],
  );
  assert(eventRows.length === 1 && eventRows[0]?.status === "delivered", "outbox not delivered");
  assert(
    attemptRows.length === 1 &&
      attemptRows[0]?.outcome === "delivered" &&
      attemptRows[0]?.normalized_failure === null,
    "outbox delivery receipt is invalid",
  );
  assert(
    workflowRows.length === 2 && workflowRows.every((row) => row.status === "complete"),
    "worker workflow outcomes are incomplete",
  );
  process.stdout.write(
    `${JSON.stringify({
      eventId,
      requestId,
      event: eventRows[0],
      deliveryAttempt: attemptRows[0],
      workflows: workflowRows,
    })}\n`,
  );
} finally {
  await cleanup();
  await Promise.all([database.close(), sql.end({ timeout: 5 })]);
}
