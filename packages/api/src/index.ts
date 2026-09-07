import { createHash, randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { initTRPC, TRPCError } from "@trpc/server";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { healthResponseSchema } from "@thaarei/contracts";
import type { AuthenticationPort, IdentityRepository } from "@thaarei/core";
import { z } from "zod";

export interface AiRuntime {
  readonly toolNames: readonly string[];
  executeTool(name: string, input: unknown, subjectId: string): Promise<unknown>;
  recordEvaluation(name: string, score: number, subjectId: string): Promise<void>;
}
export interface RequestContext {
  readonly subjectId: string | null;
  readonly organizationId: string | null;
  readonly organizationAuthorization: OrganizationAuthorizationContext | undefined;
  readonly sessionOperations: SessionOperations | undefined;
}

export interface OrganizationSummary {
  readonly id: string;
  readonly name: string;
}

export interface OrganizationAuthorization {
  readonly hasMembership: (subjectId: string, organizationId: string) => Promise<boolean>;
  readonly listOrganizations?: (subjectId: string) => Promise<readonly OrganizationSummary[]>;
}

export interface OrganizationAuthorizationContext {
  readonly hasMembership: (organizationId: string) => Promise<boolean>;
  readonly listOrganizations: () => Promise<readonly OrganizationSummary[]>;
}

export interface SessionOperations {
  readonly list: () => Promise<readonly SessionSummary[]>;
  readonly revoke: (token: string) => Promise<void>;
  readonly revokeAll: () => Promise<void>;
}

export interface SessionSummary {
  readonly id: string;
  readonly token: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
export interface ApiDependencies {
  readonly authentication: AuthenticationPort;

  readonly identity: IdentityRepository;

  readonly database: { readonly checkReadiness: () => Promise<void> };

  readonly organizationAuthorization?: OrganizationAuthorization;

  readonly readinessChecks?: readonly {
    readonly name: string;
    readonly check: () => Promise<void>;
  }[];
  readonly rateLimiter?: {
    readonly evaluate: (
      risk: "read" | "write" | "auth" | "provider",
      key: string,
    ) => Promise<{
      readonly allowed: boolean;
      readonly remaining: number;
      readonly retryAfterSeconds: number;
    }>;
  };
  readonly security?: {
    readonly allowedOrigins?: readonly string[];
    readonly trustedProxyCidrs?: readonly string[];
    readonly secureTransport?: boolean;
    readonly bodyLimitBytes?: number;
    readonly responseLimitBytes?: number;
    readonly requestTimeoutMs?: number;
  };
  readonly telemetry?: {
    readonly startRequest: (request: { readonly method: string; readonly route: string }) => {
      readonly end: (statusCode: number) => void;
    };
  };
}
export function createContext(
  subjectId: string | null,
  organizationId: string | null = null,
  options: {
    readonly organizationAuthorization?: OrganizationAuthorizationContext;
    readonly sessionOperations?: SessionOperations;
  } = {},
): RequestContext {
  return {
    subjectId,
    organizationId,
    organizationAuthorization: options.organizationAuthorization,
    sessionOperations: options.sessionOperations,
  };
}

function toHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(","));
  }
  return headers;
}

export function registerAuthenticationRoutes(
  server: FastifyInstance,
  baseURL: string,
  handler: (request: Request) => Promise<Response>,
): void {
  server.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const headers = toHeaders(request);
      headers.delete("content-length");
      const authRequest = new Request(new URL(request.url, baseURL), {
        method: request.method,
        headers,
        ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
      });
      const response = await handler(authRequest);
      for (const [name, value] of response.headers) {
        if (name !== "set-cookie") reply.header(name, value);
      }
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length > 0) reply.header("set-cookie", setCookies);
      reply.code(response.status);
      return reply.send(response.body ? await response.text() : null);
    },
  });
}

export async function resolveContext(
  request: FastifyRequest,
  dependencies: ApiDependencies,
): Promise<RequestContext> {
  const headers = toHeaders(request);
  const session = await dependencies.authentication.resolveSession(headers);
  const applicationSubject = session
    ? await dependencies.identity.resolveAuthenticationSubject(session.subjectId)
    : null;
  const requestedOrganizationId =
    typeof request.headers["x-organization-id"] === "string"
      ? request.headers["x-organization-id"].trim()
      : "";
  const organizationAuthorization =
    applicationSubject && dependencies.organizationAuthorization
      ? {
          hasMembership: (organizationId: string) =>
            dependencies.organizationAuthorization?.hasMembership(
              applicationSubject.subjectId,
              organizationId,
            ) ?? Promise.resolve(false),
          listOrganizations: async () =>
            normalizeOrganizations(
              (await dependencies.organizationAuthorization?.listOrganizations?.(
                applicationSubject.subjectId,
              )) ?? [],
            ),
        }
      : undefined;
  const organizationId =
    organizationAuthorization &&
    requestedOrganizationId &&
    (await organizationAuthorization.hasMembership(requestedOrganizationId))
      ? requestedOrganizationId
      : null;
  const sessionOperations =
    applicationSubject && session
      ? {
          list: async () =>
            normalizeSessions(await dependencies.authentication.listSessions(headers)),
          revoke: (token: string) => dependencies.authentication.revokeSession(headers, token),
          revokeAll: () => dependencies.authentication.revokeAllSessions(headers),
        }
      : undefined;
  return createContext(applicationSubject?.subjectId ?? null, organizationId, {
    ...(organizationAuthorization ? { organizationAuthorization } : {}),
    ...(sessionOperations ? { sessionOperations } : {}),
  });
}

const sessionDateSchema = z.union([z.string().datetime(), z.date()]);
const organizationSummarySchema = z
  .object({ id: z.string().min(1), name: z.string().min(1) })
  .strict();
const sessionSchema = z
  .object({
    id: z.string().min(1),
    token: z.string().min(1),
    createdAt: sessionDateSchema,
    updatedAt: sessionDateSchema,
    expiresAt: sessionDateSchema,
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
  })
  .passthrough();

function sessionDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeOrganizations(
  value: readonly OrganizationSummary[],
): readonly OrganizationSummary[] {
  return z.array(organizationSummarySchema).parse(value);
}

function normalizeSessions(value: readonly unknown[]): readonly SessionSummary[] {
  return value.map((entry) => {
    const session = sessionSchema.parse(entry);
    return {
      id: session.id,
      token: session.token,
      createdAt: sessionDate(session.createdAt),
      updatedAt: sessionDate(session.updatedAt),
      expiresAt: sessionDate(session.expiresAt),
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
    };
  });
}

const t = initTRPC.context<RequestContext>().create();
export const publicProcedure = t.procedure;
export const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.subjectId === null) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, subjectId: ctx.subjectId } });
});
export const organizationProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.organizationId)
    throw new TRPCError({ code: "BAD_REQUEST", message: "x-organization-id is required" });
  return next({ ctx: { ...ctx, organizationId: ctx.organizationId } });
});

const organizationIdInput = z
  .object({ organizationId: z.string().trim().min(1).max(128) })
  .strict();
const sessionTokenInput = z.object({ token: z.string().min(1).max(512) }).strict();

function requireOrganizationAuthorization(
  context: RequestContext,
): OrganizationAuthorizationContext {
  if (!context.organizationAuthorization) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return context.organizationAuthorization;
}

function requireSessionOperations(context: RequestContext): SessionOperations {
  if (!context.sessionOperations) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return context.sessionOperations;
}

/**
 * SOURCE OF TRUTH ID: starter.api.transport
 * SOURCE OF TRUTH KEYWORDS: api, fastify, trpc, health, identity, tenancy
 *
 * WHAT: Thin Fastify and tRPC transport composition root, including identity and organization contracts.
 * WHY: Separates request handling from domain and provider code while requiring server-side membership checks.
 * WHEN: Use for first-party API routes and health probes.
 * HOW: buildApi, appRouter
 * BOUNDARIES: Do not place SQL, authorization policy, or provider SDK calls here.
 */
export const appRouter = t.router({
  health: publicProcedure.query(() =>
    healthResponseSchema.parse({
      status: "ok",
      checkedAt: new Date().toISOString(),
      instanceId: process.env["THAAREI_FLEET_FIXTURE_ID"] ?? "local",
    }),
  ),
  viewer: authenticatedProcedure.query(({ ctx }) => ({
    subjectId: ctx.subjectId,
    organizationId: ctx.organizationId,
  })),
  organizations: t.router({
    list: authenticatedProcedure.query(({ ctx }) =>
      requireOrganizationAuthorization(ctx).listOrganizations(),
    ),
    switch: authenticatedProcedure.input(organizationIdInput).mutation(async ({ ctx, input }) => {
      const authorization = requireOrganizationAuthorization(ctx);
      if (!(await authorization.hasMembership(input.organizationId)))
        throw new TRPCError({ code: "FORBIDDEN" });
      return { organizationId: input.organizationId };
    }),
  }),
  sessions: t.router({
    list: authenticatedProcedure.query(({ ctx }) => requireSessionOperations(ctx).list()),
    revoke: authenticatedProcedure.input(sessionTokenInput).mutation(async ({ ctx, input }) => {
      await requireSessionOperations(ctx).revoke(input.token);
      return { revoked: true };
    }),
    revokeAll: authenticatedProcedure.mutation(async ({ ctx }) => {
      await requireSessionOperations(ctx).revokeAll();
      return { revoked: true };
    }),
  }),
});
export type AppRouter = typeof appRouter;

async function readinessResponse(
  checks: readonly { readonly name: string; readonly check: () => Promise<void> }[],
) {
  const checkedAt = new Date().toISOString();
  for (const check of checks) {
    try {
      await check.check();
    } catch {
      return healthResponseSchema.parse({
        status: "degraded",
        checkedAt,
        instanceId: process.env["THAAREI_FLEET_FIXTURE_ID"] ?? "local",
        failedDependency: check.name,
      });
    }
  }
  return healthResponseSchema.parse({
    status: "ok",
    checkedAt,
    instanceId: process.env["THAAREI_FLEET_FIXTURE_ID"] ?? "local",
  });
}

export function buildApi(dependencies: ApiDependencies) {
  const security = dependencies.security ?? {};
  const allowedOrigins = new Set(
    (security.allowedOrigins ?? []).map((origin) => new URL(origin).origin),
  );
  const bodyLimitBytes = security.bodyLimitBytes ?? 1_048_576;
  const responseLimitBytes = security.responseLimitBytes ?? 2_097_152;
  const requestTimeoutMs = security.requestTimeoutMs ?? 15_000;
  const server = Fastify({
    trustProxy: security.trustedProxyCidrs?.length ? [...security.trustedProxyCidrs] : false,
    bodyLimit: bodyLimitBytes,
    requestTimeout: requestTimeoutMs,
    connectionTimeout: 10_000,
    keepAliveTimeout: 5_000,
    genReqId: (request) => {
      const candidate = request.headers["x-request-id"];
      return typeof candidate === "string" && /^[A-Za-z0-9._:-]{1,128}$/u.test(candidate)
        ? candidate
        : randomUUID();
    },
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers.set-cookie",
          "body",
          "password",
          "token",
          "secret",
          "apiKey",
        ],
        censor: "[REDACTED]",
      },
      serializers: {
        req: (request) => ({ method: request.method, url: request.url, requestId: request.id }),
        res: (reply) => ({ statusCode: reply.statusCode }),
      },
    },
  });
  const requestTelemetry = new WeakMap<
    FastifyRequest,
    { readonly end: (statusCode: number) => void }
  >();
  server.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    if (dependencies.rateLimiter && request.url.startsWith("/api/auth/")) {
      const actorKey = createHash("sha256").update(request.ip).digest("hex");
      const decision = await dependencies.rateLimiter.evaluate("auth", `rate:auth:${actorKey}`);
      reply.header("x-ratelimit-remaining", decision.remaining);
      if (!decision.allowed) {
        reply.header("retry-after", decision.retryAfterSeconds);
        return reply.code(429).send({ error: "authentication rate limit exceeded" });
      }
    }
    if (dependencies.telemetry)
      requestTelemetry.set(
        request,
        dependencies.telemetry.startRequest({
          method: request.method,
          route: request.routeOptions.url ?? "unmatched",
        }),
      );
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    reply.header(
      "content-security-policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    if (security.secureTransport === true)
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    const origin = typeof request.headers.origin === "string" ? request.headers.origin : null;
    if (origin !== null) {
      let normalized: string;
      try {
        normalized = new URL(origin).origin;
      } catch {
        return reply.code(403).send({ error: "origin is not allowed" });
      }
      if (!allowedOrigins.has(normalized))
        return reply.code(403).send({ error: "origin is not allowed" });
      reply.header("access-control-allow-origin", normalized);
      reply.header("access-control-allow-credentials", "true");
      reply.header("vary", "Origin");
    }
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      request.headers.cookie &&
      origin === null
    ) {
      return reply
        .code(403)
        .send({ error: "origin is required for cookie-authenticated mutations" });
    }
    if (request.method === "OPTIONS") {
      reply.header("access-control-allow-methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
      reply.header(
        "access-control-allow-headers",
        "content-type,authorization,x-request-id,x-organization-id,idempotency-key",
      );
      return reply.code(204).send();
    }
  });
  server.addHook("onSend", async (_request, reply, payload) => {
    const size =
      typeof payload === "string"
        ? Buffer.byteLength(payload)
        : Buffer.isBuffer(payload)
          ? payload.byteLength
          : 0;
    if (size <= responseLimitBytes) return payload;
    reply.code(500).type("application/problem+json");
    return JSON.stringify({
      type: "about:blank",
      title: "Response exceeded configured limit",
      status: 500,
    });
  });
  server.addHook("onResponse", async (request, reply) =>
    requestTelemetry.get(request)?.end(reply.statusCode),
  );
  server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: ({ req }: { readonly req: FastifyRequest }) =>
        resolveContext(req, dependencies),
    },
  });
  server.get("/health/live", async () =>
    healthResponseSchema.parse({
      status: "ok",
      checkedAt: new Date().toISOString(),
      instanceId: process.env["THAAREI_FLEET_FIXTURE_ID"] ?? "local",
    }),
  );
  server.get("/health/ready", async (_request, reply) => {
    const checks = [
      ...(dependencies.database
        ? [{ name: "database", check: dependencies.database.checkReadiness }]
        : []),
      ...(dependencies.readinessChecks ?? []),
    ];
    const response = await readinessResponse(checks);
    return reply.code(response.status === "ok" ? 200 : 503).send(response);
  });
  return server;
}
