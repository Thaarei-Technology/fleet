import { buildApi, registerAuthenticationRoutes } from "@thaarei/api";
import { createDatabaseRuntime } from "@thaarei/database";
import {
  createBetterAuthAdapter,
  createIdentityMailAdapter,
  createValkeyRateLimiter,
  createValkeyRuntime,
} from "@thaarei/adapters";
import { resolve } from "node:path";
import { z } from "zod";

try {
  process.loadEnvFile(resolve(process.cwd(), ".env"));
} catch (error: unknown) {
  if (!(error instanceof Error) || !("code" in error && error.code === "ENOENT")) throw error;
}
const environmentSchema = z
  .object({
    APP_ENV: z.enum(["local", "ci", "staging", "production"]).default("local"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    ALLOWED_ORIGINS: z.string().min(1),
    TRUSTED_PROXY_CIDRS: z.string().optional().default(""),
    REQUEST_BODY_LIMIT_BYTES: z.coerce.number().int().min(1024).max(10_485_760).default(1048576),
    RESPONSE_BODY_LIMIT_BYTES: z.coerce.number().int().min(1024).max(10_485_760).default(2097152),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(15000),
    API_DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    IDENTITY_MAIL_PROVIDER: z.enum(["mailpit", "zeptomail"]),
    IDENTITY_FROM_EMAIL: z.string().email(),
    IDENTITY_ZEPTOMAIL_API_KEY: z.string().optional().default(""),
    IDENTITY_ZEPTOMAIL_URL: z.string().url().optional(),
    IDENTITY_MAILPIT_URL: z.string().url().optional(),
    VALKEY_URL: z.string().min(1),
  })
  .superRefine((value, context) => {
    const deployed = value.APP_ENV === "staging" || value.APP_ENV === "production";
    if (
      deployed &&
      (value.BETTER_AUTH_SECRET.length < 32 ||
        value.BETTER_AUTH_SECRET === "replace-with-a-local-secret")
    )
      context.addIssue({
        code: "custom",
        message:
          "BETTER_AUTH_SECRET must be a non-placeholder secret of at least 32 characters outside local and CI",
      });
    if (deployed && value.IDENTITY_MAIL_PROVIDER !== "zeptomail")
      context.addIssue({
        code: "custom",
        message: "emulated identity mail is forbidden outside local and CI",
      });
    if (value.IDENTITY_MAIL_PROVIDER === "zeptomail" && !value.IDENTITY_ZEPTOMAIL_API_KEY)
      context.addIssue({
        code: "custom",
        message: "IDENTITY_ZEPTOMAIL_API_KEY is required for ZeptoMail",
      });
  });
const environment = environmentSchema.parse(process.env);
export async function startApi(): Promise<void> {
  const database = createDatabaseRuntime(environment.API_DATABASE_URL);
  const valkey = await createValkeyRuntime({ url: environment.VALKEY_URL });
  const identityMail = createIdentityMailAdapter({
    provider: environment.IDENTITY_MAIL_PROVIDER,
    from: environment.IDENTITY_FROM_EMAIL,
    ...(environment.IDENTITY_MAILPIT_URL ? { mailpitUrl: environment.IDENTITY_MAILPIT_URL } : {}),
    ...(environment.IDENTITY_ZEPTOMAIL_API_KEY
      ? { zeptoMailApiKey: environment.IDENTITY_ZEPTOMAIL_API_KEY }
      : {}),
    ...(environment.IDENTITY_ZEPTOMAIL_URL
      ? { zeptoMailUrl: environment.IDENTITY_ZEPTOMAIL_URL }
      : {}),
  });
  const authentication = createBetterAuthAdapter({
    appName: "Thaarei Fleet",
    secret: environment.BETTER_AUTH_SECRET,
    baseURL: environment.BETTER_AUTH_URL,
    trustedOrigins: [new URL(environment.BETTER_AUTH_URL).origin],
    database: database.authentication.database,
    schema: database.authentication.schema,
    identityMail,
    onUserCreated: async (authenticationSubjectId) => {
      await database.identity.ensureAuthenticationSubject(authenticationSubjectId);
    },
    recordAssurance: database.authentication.recordAssurance,
    resolveAssurance: database.authentication.resolveAssurance,
  });
  const identity = database.identity;
  const organizationAuthorization = database.organization;
  const rateLimiter = createValkeyRateLimiter({ increment: valkey.increment });
  const server = buildApi({
    database,
    authentication,
    identity,
    organizationAuthorization,
    rateLimiter,
    readinessChecks: [{ name: "valkey", check: valkey.checkReadiness }],
    security: {
      allowedOrigins: environment.ALLOWED_ORIGINS.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      trustedProxyCidrs: environment.TRUSTED_PROXY_CIDRS.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      secureTransport: environment.APP_ENV === "production",
      bodyLimitBytes: environment.REQUEST_BODY_LIMIT_BYTES,
      responseLimitBytes: environment.RESPONSE_BODY_LIMIT_BYTES,
      requestTimeoutMs: environment.REQUEST_TIMEOUT_MS,
    },
  });
  registerAuthenticationRoutes(server, environment.BETTER_AUTH_URL, authentication.handler);
  let shutdown: Promise<void> | null = null;
  const stop = (signal: string): Promise<void> => {
    shutdown ??= (async () => {
      server.log.info({ signal }, "graceful shutdown started");
      await server.close();
      valkey.close();
      await database.close();
    })();
    return shutdown;
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => {
      void stop(signal).catch(() => {
        process.exitCode = 1;
      });
    });
  await server.listen({ host: "0.0.0.0", port: environment.PORT });
}

await startApi();
