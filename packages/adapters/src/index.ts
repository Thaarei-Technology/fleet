import type { CachePort, RateLimitRisk, RateLimitDecision } from "@thaarei/core";
import { cacheKey, evaluateRateLimit } from "@thaarei/core";
import {
  Decoder,
  GlideClient,
  type GlideClientConfiguration,
  type GlideReturnType,
} from "@valkey/valkey-glide";

/**
 * SOURCE OF TRUTH ID: starter.adapters.outbound-http
 * SOURCE OF TRUTH KEYWORDS: http, retry, timeout, response-limit, idempotency
 *
 * WHAT: Bounded outbound HTTP execution policy for provider adapters.
 * WHY: Provider calls need consistent cancellation, retry, and memory limits without leaking credentials or URLs.
 * WHEN: Use for every direct HTTP provider call owned by adapters.
 * HOW: createBoundedHttpClient
 * BOUNDARIES: Only adapters perform provider HTTP; callers supply idempotency and correlation identifiers.
 */
export function createBoundedHttpClient(input: {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maximumResponseBytes?: number;
  readonly maximumRetries?: number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly random?: () => number;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 10_000, 100), 120_000);
  const maximumResponseBytes = Math.min(
    Math.max(input.maximumResponseBytes ?? 2_097_152, 1024),
    10_485_760,
  );
  const maximumRetries = Math.min(Math.max(input.maximumRetries ?? 2, 0), 3);
  const sleep =
    input.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolveSleep) => setTimeout(resolveSleep, milliseconds)));
  const random = input.random ?? Math.random;
  return async (
    url: string | URL,
    init: RequestInit = {},
    correlationId?: string,
  ): Promise<Response> => {
    const target = new URL(url);
    if (target.protocol !== "https:" && target.protocol !== "http:")
      throw new Error("Outbound URL protocol is forbidden");
    if (target.username || target.password)
      throw new Error("Outbound URL credentials are forbidden");
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    if (correlationId) headers.set("x-request-id", correlationId);
    headers.set("user-agent", "thaarei-starter/1.0");
    const retryableMethod =
      ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"].includes(method) ||
      headers.has("idempotency-key") ||
      headers.has("x-idempotency-key");
    let lastError: unknown;
    for (let attempt = 0; attempt <= maximumRetries; attempt += 1) {
      try {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
        const response = await fetchImpl(url, { ...init, headers, signal });
        const declaredLength = Number(response.headers.get("content-length") ?? "0");
        if (
          !Number.isSafeInteger(declaredLength) ||
          declaredLength < 0 ||
          declaredLength > maximumResponseBytes
        )
          throw new Error("Provider response exceeded configured limit");
        if (
          retryableMethod &&
          attempt < maximumRetries &&
          (response.status === 429 || response.status >= 500)
        ) {
          await response.body?.cancel();
          await sleep(Math.round(100 * 2 ** attempt + random() * 50));
          continue;
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > maximumResponseBytes)
          throw new Error("Provider response exceeded configured limit");
        return new Response(bytes, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (error: unknown) {
        lastError = error;
        if (!retryableMethod || attempt >= maximumRetries) break;
        await sleep(Math.round(100 * 2 ** attempt + random() * 50));
      }
    }
    throw new Error("Outbound provider request failed", { cause: lastError });
  };
}

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import {
  canBootstrapStrongFactor,
  canPerformSensitiveAccountChange,
  type AssuranceLevel,
  type IdentityMailPort,
} from "@thaarei/core";
/**
 * SOURCE OF TRUTH ID: starter.identity.authentication-adapter
 * SOURCE OF TRUTH KEYWORDS: identity, authentication, better-auth, session
 *
 * WHAT: Better Auth server adapter for authentication artifacts and session resolution.
 * WHY: Authentication stays provider-owned while application identity and authorization remain separate.
 * WHEN: Compose the API authentication routes and request context.
 * HOW: createBetterAuthAdapter
 * BOUNDARIES: The adapter never grants application permissions from an authentication session alone.
 */
export function createIdentityMailAdapter(input: {
  readonly provider: "mailpit" | "zeptomail";
  readonly from: string;
  readonly mailpitUrl?: string;
  readonly zeptoMailApiKey?: string;
  readonly zeptoMailUrl?: string;
  readonly fetch?: typeof fetch;
}): IdentityMailPort {
  const request = createBoundedHttpClient({ ...(input.fetch ? { fetchImpl: input.fetch } : {}) });
  const send = async (message: {
    readonly email: string;
    readonly url: string;
    readonly kind: "verification" | "password-reset";
  }): Promise<void> => {
    const subject = message.kind === "verification" ? "Verify your email" : "Reset your password";
    const endpoint =
      input.provider === "zeptomail"
        ? (input.zeptoMailUrl ?? "https://api.zeptomail.in/v1.1/email")
        : `${input.mailpitUrl ?? "http://127.0.0.1:8025"}/api/v1/send`;
    if (input.provider === "zeptomail" && !input.zeptoMailApiKey)
      throw new Error("IDENTITY_ZEPTOMAIL_API_KEY is required for ZeptoMail identity mail");
    const response = await request(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.zeptoMailApiKey
          ? { authorization: `Zoho-enczapikey ${input.zeptoMailApiKey}` }
          : {}),
      },
      body: JSON.stringify(
        input.provider === "zeptomail"
          ? {
              from: { address: input.from },
              to: [{ email_address: { address: message.email } }],
              subject,
              htmlbody: `<p><a href="${message.url}">${subject}</a></p>`,
            }
          : {
              From: { Email: input.from },
              To: [{ Email: message.email }],
              Subject: subject,
              HTML: `<p><a href="${message.url}">${subject}</a></p>`,
            },
      ),
    });
    if (!response.ok)
      throw new Error(`Identity mail provider rejected delivery: ${response.status}`);
  };
  return {
    sendVerification: (message) => send({ ...message, kind: "verification" }),
    sendPasswordReset: (message) => send({ ...message, kind: "password-reset" }),
  };
}
export function assuranceForCompletedAuthenticationPath(path: string): AssuranceLevel {
  if (path === "/passkey/verify-authentication") return "phishing_resistant";
  if (path === "/two-factor/verify-totp") return "multi_factor";
  if (path === "/two-factor/verify-backup-code") return "recovery";
  return "single_factor";
}
const sensitiveAccountPaths = new Set([
  "/change-password",
  "/change-email",
  "/delete-user",
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/passkey/add-passkey",
  "/passkey/delete-passkey",
]);
const bootstrapStrongFactorPaths = new Set(["/two-factor/enable", "/passkey/add-passkey"]);
export function requiresRecentAccountAssurance(path: string): boolean {
  return sensitiveAccountPaths.has(path);
}
export function createBetterAuthAdapter(input: {
  readonly appName: string;
  readonly secret: string;
  readonly baseURL: string;
  readonly trustedOrigins: readonly string[];
  readonly database: Parameters<typeof drizzleAdapter>[0];
  readonly schema: Record<string, unknown>;
  readonly identityMail: IdentityMailPort;
  readonly onUserCreated: (authenticationSubjectId: string) => Promise<void>;
  readonly recordAssurance: (sessionToken: string, assurance: AssuranceLevel) => Promise<void>;
  readonly resolveAssurance: (
    sessionToken: string,
  ) => Promise<{ readonly assurance: AssuranceLevel; readonly authenticatedAt: string } | null>;
}) {
  const auth = betterAuth({
    appName: input.appName,
    secret: input.secret,
    baseURL: input.baseURL,
    trustedOrigins: [...input.trustedOrigins],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        input.identityMail.sendPasswordReset({ email: user.email, url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) =>
        input.identityMail.sendVerification({ email: user.email, url }),
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/send-verification-email": { window: 300, max: 3 },
        "/request-password-reset": { window: 300, max: 3 },
      },
    },
    plugins: [twoFactor({ issuer: input.appName }), passkey()],
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(context.path)) {
          const body = context.body as { trustDevice?: unknown } | undefined;
          if (body?.trustDevice === true)
            throw new APIError("BAD_REQUEST", { message: "Trusted-device MFA bypass is disabled" });
        }
      }),
      after: createAuthMiddleware(async (context) => {
        const newSession = context.context.newSession;
        if (!newSession) return;
        const assurance = assuranceForCompletedAuthenticationPath(context.path);
        await input.recordAssurance(newSession.session.token, assurance);
      }),
    },
    database: drizzleAdapter(input.database, { provider: "pg", schema: input.schema }),
    databaseHooks: { user: { create: { after: async (user) => input.onUserCreated(user.id) } } },
  });
  const handler = async (request: Request): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    const path = pathname.startsWith("/api/auth") ? pathname.slice("/api/auth".length) : pathname;
    if (requiresRecentAccountAssurance(path)) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.session?.token) return new Response(null, { status: 401 });
      const assurance = await input.resolveAssurance(session.session.token);
      let bootstrapAllowed = false;
      if (assurance && bootstrapStrongFactorPaths.has(path)) {
        const hasExistingStrongFactor =
          path === "/two-factor/enable"
            ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled === true
            : (await auth.api.listPasskeys({ headers: request.headers })).length > 0;
        bootstrapAllowed = canBootstrapStrongFactor(assurance, hasExistingStrongFactor);
      }
      if (!assurance || (!canPerformSensitiveAccountChange(assurance) && !bootstrapAllowed)) {
        return Response.json({ code: "RECENT_ASSURANCE_REQUIRED" }, { status: 403 });
      }
    }
    return auth.handler(request);
  };
  return {
    auth,
    handler,
    resolveSession: async (headers: Headers) => {
      const session = await auth.api.getSession({ headers });
      if (!session?.user?.id) return null;
      const assurance = await input.resolveAssurance(session.session.token);
      return {
        subjectId: session.user.id,
        assurance: assurance?.assurance ?? "single_factor",
        authenticatedAt: assurance?.authenticatedAt ?? session.session.createdAt.toISOString(),
      };
    },
    listSessions: async (headers: Headers) => auth.api.listSessions({ headers }),
    revokeSession: async (headers: Headers, token: string) => {
      await auth.api.revokeSession({ headers, body: { token } });
    },
    revokeAllSessions: async (headers: Headers) => {
      await auth.api.revokeSessions({ headers });
    },
  };
}

import { run } from "graphile-worker";
export function startGraphileWorker(options: Parameters<typeof run>[0]) {
  return run(options);
}

export function createJsonProvider(input: {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
}) {
  const fetchImpl = createBoundedHttpClient({
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
  });
  return {
    request: async (path: string, body: Readonly<Record<string, unknown>>) => {
      const response = await fetchImpl(new URL(path, input.baseUrl), {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${input.apiKey}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`provider request failed: ${response.status}`);
      return response.json() as Promise<unknown>;
    },
  };
}

export interface ValkeyCommandClient {
  customCommand(args: string[], options?: { readonly decoder?: Decoder }): Promise<GlideReturnType>;
  close(errorMessage?: string): void;
}

export interface ValkeyRuntime {
  readonly execute: (command: string, args: readonly string[]) => Promise<unknown>;
  readonly increment: (key: string, windowSeconds: number) => Promise<number>;
  readonly checkReadiness: () => Promise<void>;
  readonly close: () => void;
}

const atomicWindowIncrementScript = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "return current",
].join("\n");

export async function createValkeyRuntime(input: {
  readonly url: string;
  readonly createClient?: (configuration: GlideClientConfiguration) => Promise<ValkeyCommandClient>;
}): Promise<ValkeyRuntime> {
  const url = new URL(input.url);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:")
    throw new Error("VALKEY_URL must use redis or rediss");
  if (url.search || url.hash) throw new Error("VALKEY_URL query and fragment are forbidden");
  const databasePath = url.pathname.replace(/^\//u, "");
  const databaseId = databasePath === "" ? 0 : Number(databasePath);
  if (!Number.isSafeInteger(databaseId) || databaseId < 0)
    throw new Error("VALKEY_URL database must be a non-negative integer");
  const port = url.port === "" ? 6379 : Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
    throw new Error("VALKEY_URL port is invalid");
  const configuration: GlideClientConfiguration = {
    addresses: [{ host: url.hostname, port }],
    databaseId,
    useTLS: url.protocol === "rediss:",
    ...(url.password
      ? {
          credentials: {
            username: decodeURIComponent(url.username || "default"),
            password: decodeURIComponent(url.password),
          },
        }
      : {}),
  };
  const client = input.createClient
    ? await input.createClient(configuration)
    : await GlideClient.createClient(configuration);
  const execute = (command: string, args: readonly string[]): Promise<GlideReturnType> =>
    client.customCommand([command, ...args], { decoder: Decoder.String });
  return {
    execute,
    increment: async (key, windowSeconds) => {
      if (!key || !Number.isSafeInteger(windowSeconds) || windowSeconds <= 0)
        throw new Error("Valkey counter input is invalid");
      const result = await client.customCommand([
        "EVAL",
        atomicWindowIncrementScript,
        "1",
        key,
        String(windowSeconds),
      ]);
      if (typeof result !== "number" || !Number.isSafeInteger(result) || result < 1)
        throw new Error("Valkey counter returned an invalid value");
      return result;
    },
    checkReadiness: async () => {
      if ((await execute("PING", [])) !== "PONG") throw new Error("Valkey readiness failed");
    },
    close: () => client.close(),
  };
}

export function createValkeyCacheAdapter(input: {
  readonly execute: (command: string, args: readonly string[]) => Promise<unknown>;
  readonly organizationId: string;
}) {
  const prefix = (key: string) => cacheKey(input.organizationId, "starter", key);
  return {
    get: async <T>(key: string, parse: (value: unknown) => T): Promise<T | null> => {
      const value = await input.execute("GET", [prefix(key)]);
      if (typeof value !== "string") return null;
      return parse(JSON.parse(value));
    },
    set: async <T>(key: string, value: T, ttlSeconds: number): Promise<void> => {
      if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > 86_400)
        throw new Error("Cache TTL is outside the bounded policy");
      await input.execute("SETEX", [prefix(key), String(ttlSeconds), JSON.stringify(value)]);
    },
    delete: async (key: string): Promise<void> => {
      await input.execute("DEL", [prefix(key)]);
    },
    checkReadiness: async (): Promise<void> => {
      await input.execute("PING", []);
    },
  } satisfies CachePort & { readonly checkReadiness: () => Promise<void> };
}

export function createValkeyRateLimiter(input: {
  readonly increment: (key: string, windowSeconds: number) => Promise<number>;
}) {
  return {
    evaluate: async (
      risk: RateLimitRisk,
      key: string,
      nowEpochSeconds = Math.floor(Date.now() / 1000),
    ): Promise<RateLimitDecision> => {
      try {
        return evaluateRateLimit({ risk, count: await input.increment(key, 60), nowEpochSeconds });
      } catch {
        return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
      }
    },
  };
}
