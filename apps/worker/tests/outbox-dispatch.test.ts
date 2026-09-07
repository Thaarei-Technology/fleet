import type { DomainEvent, OutboxDeliveryPort } from "@thaarei/core";
import { expect, test } from "vitest";
import { dispatchOutboxEvent } from "../src/outbox-dispatch.js";

function outboxFor(event: DomainEvent<Record<string, unknown>>) {
  const calls: string[] = [];
  const outbox: OutboxDeliveryPort = {
    claim: async () => ({
      fencingToken: 3,
      attemptNumber: 1,
      destination: "internal",
      event,
    }),
    recordAttempt: async (_eventId, _token, outcome, failure) => {
      calls.push(`attempt:${outcome}:${failure ?? "none"}`);
    },
    markDelivered: async () => {
      calls.push("delivered");
    },
    replay: async () => undefined,
  };
  return { calls, outbox };
}

const baseEvent = {
  id: "event-1",
  schemaVersion: 1,
  aggregateType: "foundation-probe",
  aggregateId: "probe-1",
  occurredAt: "2026-09-07T00:00:00.000Z",
  correlationId: "correlation-1",
};

test("typed dispatcher records delivery only after the implemented handler succeeds", async () => {
  const fixture = outboxFor({
    ...baseEvent,
    type: "fleet.foundation.probe.requested.v1",
    payload: { requestId: "probe-1" },
  });
  const calls = fixture.calls;
  await expect(
    dispatchOutboxEvent({
      outbox: fixture.outbox,
      eventId: "event-1",
      leaseOwner: "worker-1",
      handlers: {
        recordFoundationProbe: async (requestId) => calls.push(`handled:${requestId}`),
      },
    }),
  ).resolves.toBe("delivered");
  expect(calls).toEqual(["handled:probe-1", "attempt:delivered:none", "delivered"]);
});

test("unknown events fail visibly and are never marked delivered", async () => {
  const fixture = outboxFor({
    ...baseEvent,
    type: "fleet.unknown.v1",
    payload: {},
  });
  await expect(
    dispatchOutboxEvent({
      outbox: fixture.outbox,
      eventId: "event-1",
      leaseOwner: "worker-1",
      handlers: { recordFoundationProbe: async () => undefined },
    }),
  ).rejects.toThrow("No outbox handler for event type: fleet.unknown.v1");
  expect(fixture.calls).toEqual([
    "attempt:retry:No outbox handler for event type: fleet.unknown.v1",
  ]);
});
