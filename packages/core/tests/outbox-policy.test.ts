import { expect, test } from "vitest";
import {
  isCurrentFencingToken,
  retryDelayMilliseconds,
  validateDomainEvent,
} from "../src/index.js";

test("outbox retry delay is bounded and fencing rejects stale workers", () => {
  expect(retryDelayMilliseconds(1, 0.5)).toBe(1000);
  expect(retryDelayMilliseconds(99, 1)).toBe(900000);
  expect(isCurrentFencingToken(2, 2)).toBe(true);
  expect(isCurrentFencingToken(2, 1)).toBe(false);
});

test("domain event validation rejects unversioned or non-object payloads", () => {
  expect(() =>
    validateDomainEvent({
      id: "event-1",
      type: "example.created",
      schemaVersion: 1,
      aggregateType: "example",
      aggregateId: "example-1",
      payload: {},
      occurredAt: new Date().toISOString(),
      correlationId: "correlation-1",
    }),
  ).not.toThrow();
  expect(() =>
    validateDomainEvent({
      id: "event-2",
      type: "example.created",
      schemaVersion: 0,
      aggregateType: "example",
      aggregateId: "example-1",
      payload: {},
    }),
  ).toThrow();
});
