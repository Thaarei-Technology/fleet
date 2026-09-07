import { expect, test } from "vitest";
import { buildApi, registerAuthenticationRoutes } from "../src/index.js";

test("liveness stays local while failed dependencies make readiness unavailable", async () => {
  const server = buildApi({
    authentication: { resolveSession: async () => null },
    identity: {
      ensureAuthenticationSubject: async (subjectId: string) => ({ subjectId }),
      resolveAuthenticationSubject: async () => null,
    },
    database: { checkReadiness: async () => undefined },
    readinessChecks: [
      {
        name: "provider",
        check: async () => {
          throw new Error("provider unavailable");
        },
      },
    ],
  });
  const live = await server.inject({ method: "GET", url: "/health/live" });
  const ready = await server.inject({ method: "GET", url: "/health/ready" });
  expect(live.statusCode).toBe(200);
  expect(ready.statusCode).toBe(503);
  expect(ready.json()).toMatchObject({ status: "degraded", failedDependency: "provider" });
  expect(ready.body).not.toContain("provider unavailable");
  await server.close();
});

test("central security policy emits headers and rejects untrusted origins and oversized bodies", async () => {
  const server = buildApi({
    authentication: { resolveSession: async () => null },
    identity: {
      ensureAuthenticationSubject: async (subjectId: string) => ({ subjectId }),
      resolveAuthenticationSubject: async () => null,
    },
    database: { checkReadiness: async () => undefined },
    security: {
      allowedOrigins: ["https://app.example.test"],
      secureTransport: true,
      bodyLimitBytes: 32,
    },
  });
  const allowed = await server.inject({
    method: "GET",
    url: "/health/live",
    headers: { origin: "https://app.example.test" },
  });
  expect(allowed.statusCode).toBe(200);
  expect(allowed.headers["x-content-type-options"]).toBe("nosniff");
  expect(allowed.headers["strict-transport-security"]).toContain("max-age");
  expect(allowed.headers["access-control-allow-origin"]).toBe("https://app.example.test");
  expect(allowed.headers["x-request-id"]).toBeTruthy();
  const correlated = await server.inject({
    method: "GET",
    url: "/health/live",
    headers: { "x-request-id": "safe-request-123" },
  });
  expect(correlated.headers["x-request-id"]).toBe("safe-request-123");
  const preflight = await server.inject({
    method: "OPTIONS",
    url: "/trpc/viewer",
    headers: { origin: "https://app.example.test", "access-control-request-method": "POST" },
  });
  expect(preflight.statusCode).toBe(204);
  const anonymous = await server.inject({ method: "GET", url: "/trpc/viewer" });
  expect(anonymous.statusCode).toBe(401);
  const denied = await server.inject({
    method: "GET",
    url: "/health/live",
    headers: { origin: "https://evil.example.test" },
  });
  expect(denied.statusCode).toBe(403);
  const csrfDenied = await server.inject({
    method: "POST",
    url: "/trpc/viewer",
    headers: { cookie: "session=value", "content-type": "application/json" },
    payload: {},
  });
  expect(csrfDenied.statusCode).toBe(403);
  const oversized = await server.inject({
    method: "POST",
    url: "/trpc/viewer",
    headers: { "content-type": "application/json" },
    payload: { value: "x".repeat(64) },
  });
  expect(oversized.statusCode).toBe(413);
  await server.close();
});

test("HTTP request context resolves authenticated and anonymous sessions", async () => {
  const server = buildApi({
    authentication: {
      resolveSession: async (headers) => {
        const subjectId = headers.get("x-subject");
        return subjectId ? { subjectId } : null;
      },
    },
    identity: {
      ensureAuthenticationSubject: async (subjectId) => ({ subjectId }),
      resolveAuthenticationSubject: async (subjectId) => ({ subjectId }),
    },
    database: { checkReadiness: async () => undefined },
  });
  const anonymous = await server.inject({ method: "GET", url: "/trpc/viewer" });
  const authenticated = await server.inject({
    method: "GET",
    url: "/trpc/viewer",
    headers: { "x-subject": "subject-1" },
  });
  expect(anonymous.statusCode).toBe(401);
  expect(authenticated.statusCode).toBe(200);
  expect(authenticated.body).toContain("subject-1");
  await server.close();
});

test("authentication routes forward Fastify JSON bodies and response cookies", async () => {
  const server = buildApi({
    authentication: { resolveSession: async () => null },
    identity: {
      ensureAuthenticationSubject: async (subjectId: string) => ({ subjectId }),
      resolveAuthenticationSubject: async () => null,
    },
    database: { checkReadiness: async () => undefined },
  });
  let receivedBody: unknown;
  registerAuthenticationRoutes(server, "http://auth.example.test", async (request) => {
    receivedBody = await request.json();
    return new Response(JSON.stringify({ accepted: true }), {
      status: 201,
      headers: {
        "content-type": "application/json",
        "set-cookie": "session=test; HttpOnly; SameSite=Lax",
      },
    });
  });
  const response = await server.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: { email: "local@example.test" },
  });
  expect(response.statusCode).toBe(201);
  expect(receivedBody).toEqual({ email: "local@example.test" });
  expect(String(response.headers["set-cookie"])).toContain("session=test");
  await server.close();
});

test("authentication transport enforces the injected fail-closed distributed limiter", async () => {
  const keys: string[] = [];
  const server = buildApi({
    authentication: { resolveSession: async () => null },
    identity: {
      ensureAuthenticationSubject: async (subjectId: string) => ({ subjectId }),
      resolveAuthenticationSubject: async () => null,
    },
    database: { checkReadiness: async () => undefined },
    rateLimiter: {
      evaluate: async (risk, key) => {
        expect(risk).toBe("auth");
        keys.push(key);
        return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
      },
    },
  });
  registerAuthenticationRoutes(server, "http://auth.example.test", async () =>
    Response.json({ shouldNotRun: true }),
  );

  const response = await server.inject({ method: "GET", url: "/api/auth/get-session" });
  expect(response.statusCode).toBe(429);
  expect(response.headers["retry-after"]).toBe("60");
  expect(keys).toHaveLength(1);
  expect(keys[0]).toMatch(/^rate:auth:[a-f0-9]{64}$/u);
  await server.close();
});
