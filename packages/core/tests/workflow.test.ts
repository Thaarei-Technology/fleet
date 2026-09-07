import { expect, test } from "vitest";
import { runIdempotentWorkflow, type WorkflowStore } from "../src/index.js";

function store(): WorkflowStore {
  const claims = new Map<
    string,
    { status: "running" | "complete"; token: string; expiresAt: Date }
  >();
  return {
    begin: async (key, token, now, expiresAt) => {
      const claim = claims.get(key);
      if (claim?.status === "complete" || (claim?.status === "running" && claim.expiresAt > now))
        return false;
      claims.set(key, { status: "running", token, expiresAt });
      return true;
    },
    complete: async (key, token) => {
      const claim = claims.get(key);
      if (claim?.token === token) claims.set(key, { ...claim, status: "complete" });
    },
    fail: async (key, token) => {
      if (claims.get(key)?.token === token) claims.delete(key);
    },
  };
}

test("workflow suppresses duplicates and releases a failed claim for retry", async () => {
  const workflow = store();
  await expect(
    runIdempotentWorkflow(workflow, "request-1", async () => {
      throw new Error("retry");
    }),
  ).rejects.toThrow("retry");
  await expect(runIdempotentWorkflow(workflow, "request-1", async () => undefined)).resolves.toBe(
    "completed",
  );
  await expect(runIdempotentWorkflow(workflow, "request-1", async () => undefined)).resolves.toBe(
    "duplicate",
  );
});

test("workflow rejects an active claim and takes over an expired crash lease", async () => {
  const workflow = store();
  const startedAt = new Date("2026-08-19T00:00:00.000Z");
  await expect(
    workflow.begin("crashed", "crashed-token", startedAt, new Date("2026-08-19T00:05:00.000Z")),
  ).resolves.toBe(true);
  await expect(
    runIdempotentWorkflow(workflow, "crashed", async () => undefined, {
      now: () => new Date("2026-08-19T00:01:00.000Z"),
    }),
  ).resolves.toBe("duplicate");
  await expect(
    runIdempotentWorkflow(workflow, "crashed", async () => undefined, {
      now: () => new Date("2026-08-19T00:06:00.000Z"),
    }),
  ).resolves.toBe("completed");
});

test("an expired worker cannot complete or fail a replacement claim", async () => {
  const workflow = store();
  const startedAt = new Date("2026-08-19T00:00:00.000Z");
  const replacedAt = new Date("2026-08-19T00:06:00.000Z");
  const replacementExpiry = new Date("2026-08-19T00:11:00.000Z");

  await workflow.begin(
    "stale-complete",
    "old-complete",
    startedAt,
    new Date("2026-08-19T00:05:00.000Z"),
  );
  await workflow.begin("stale-complete", "replacement-complete", replacedAt, replacementExpiry);
  await workflow.complete("stale-complete", "old-complete");
  await expect(
    runIdempotentWorkflow(workflow, "stale-complete", async () => undefined, {
      now: () => new Date("2026-08-19T00:12:00.000Z"),
      claimToken: () => "third-complete",
    }),
  ).resolves.toBe("completed");

  await workflow.begin("stale-fail", "old-fail", startedAt, new Date("2026-08-19T00:05:00.000Z"));
  await workflow.begin("stale-fail", "replacement-fail", replacedAt, replacementExpiry);
  await workflow.fail("stale-fail", "old-fail");
  await expect(
    runIdempotentWorkflow(workflow, "stale-fail", async () => undefined, {
      now: () => new Date("2026-08-19T00:07:00.000Z"),
      claimToken: () => "third-fail",
    }),
  ).resolves.toBe("duplicate");
});
