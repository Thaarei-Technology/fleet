import { Decoder } from "@valkey/valkey-glide";
import { expect, test } from "vitest";
import { createValkeyRateLimiter, createValkeyRuntime } from "../src/index.js";

test("GLIDE runtime derives a bounded standalone configuration and uses an atomic window counter", async () => {
  const calls: string[][] = [];
  let closed = false;
  let captured: unknown;
  const runtime = await createValkeyRuntime({
    url: "rediss://fleet-user:secret@valkey.example.test:6380/2",
    createClient: async (configuration) => {
      captured = configuration;
      return {
        customCommand: async (args, options) => {
          calls.push([...args]);
          if (args[0] === "PING") expect(options?.decoder).toBe(Decoder.String);
          return args[0] === "PING" ? "PONG" : 1;
        },
        close: () => {
          closed = true;
        },
      };
    },
  });

  expect(captured).toEqual({
    addresses: [{ host: "valkey.example.test", port: 6380 }],
    databaseId: 2,
    useTLS: true,
    credentials: { username: "fleet-user", password: "secret" },
  });
  await expect(runtime.increment("rate:auth:key", 60)).resolves.toBe(1);
  await expect(runtime.checkReadiness()).resolves.toBeUndefined();
  expect(calls[0]).toEqual(["EVAL", expect.stringContaining("INCR"), "1", "rate:auth:key", "60"]);
  runtime.close();
  expect(closed).toBe(true);
});

test("rate limiting fails closed without resetting durable usage", async () => {
  const limiter = createValkeyRateLimiter({
    increment: async () => {
      throw new Error("coordination unavailable");
    },
  });
  await expect(limiter.evaluate("auth", "rate:auth:key", 120)).resolves.toEqual({
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 60,
  });
});
