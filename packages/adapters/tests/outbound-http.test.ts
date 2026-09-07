import { expect, test } from "vitest";
import { createBoundedHttpClient } from "../src/index.js";

test("bounded HTTP retries only idempotent requests and adds correlation headers", async () => {
  let calls = 0;
  const client = createBoundedHttpClient({
    fetchImpl: async (_url, init) => {
      calls += 1;
      const headers = new Headers(init?.headers);
      expect(headers.get("user-agent")).toBe("thaarei-starter/1.0");
      expect(headers.get("x-request-id")).toBe("request-1");
      return calls === 1 ? new Response("retry", { status: 503 }) : Response.json({ ok: true });
    },
    sleep: async () => undefined,
    random: () => 0,
  });
  const response = await client(
    "https://provider.example.test/operation",
    { method: "POST", headers: { "idempotency-key": "operation-1" } },
    "request-1",
  );
  expect(response.status).toBe(200);
  expect(calls).toBe(2);
});

test("bounded HTTP does not retry unsafe requests and rejects large unknown-length responses", async () => {
  let unsafeCalls = 0;
  const unsafe = createBoundedHttpClient({
    fetchImpl: async () => {
      unsafeCalls += 1;
      return new Response("failed", { status: 503 });
    },
    sleep: async () => undefined,
  });
  const response = await unsafe("https://provider.example.test/operation", { method: "POST" });
  expect(response.status).toBe(503);
  expect(unsafeCalls).toBe(1);

  const oversized = createBoundedHttpClient({
    fetchImpl: async () => new Response("x".repeat(1025)),
    maximumResponseBytes: 1024,
    maximumRetries: 0,
  });
  await expect(oversized("https://provider.example.test/data")).rejects.toThrow(
    "Outbound provider request failed",
  );
});
