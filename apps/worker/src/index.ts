import { createServer } from "node:http";
import { resolve } from "node:path";
import { startGraphileWorker } from "@thaarei/adapters";
import { jobPayloadSchema } from "@thaarei/contracts";
import { runIdempotentWorkflow } from "@thaarei/core";
import { createDatabaseRuntime } from "@thaarei/database";
import { z } from "zod";
import { dispatchOutboxEvent } from "./outbox-dispatch.js";

try {
  process.loadEnvFile(resolve(process.cwd(), ".env"));
} catch (error: unknown) {
  if (!(error instanceof Error) || !("code" in error && error.code === "ENOENT")) throw error;
}

const environment = z
  .object({
    WORKER_DATABASE_URL: z.string().min(1),
    WORKER_PORT: z.coerce.number().int().min(1).max(65535).default(3002),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(2),
  })
  .parse(process.env);
export async function startWorker(): Promise<void> {
  const database = createDatabaseRuntime(environment.WORKER_DATABASE_URL);

  const runner = await startGraphileWorker({
    connectionString: environment.WORKER_DATABASE_URL,
    concurrency: environment.WORKER_CONCURRENCY,
    taskList: {
      "thaarei_fleet.health": async (payload) => {
        const parsed = jobPayloadSchema.parse(payload);
        await runIdempotentWorkflow(database.workflow, parsed.requestId, async () => undefined);
      },
      "thaarei_fleet.outbox.dispatch": async (payload) => {
        const parsed = z
          .object({ eventId: z.string().min(1), leaseOwner: z.string().min(1).default("worker") })
          .parse(payload);
        await runIdempotentWorkflow(database.workflow, `outbox:${parsed.eventId}`, async () => {
          await dispatchOutboxEvent({
            outbox: database.outbox,
            eventId: parsed.eventId,
            leaseOwner: parsed.leaseOwner,
            handlers: {
              recordFoundationProbe: async (requestId) => {
                await runIdempotentWorkflow(
                  database.workflow,
                  `foundation-probe:${requestId}`,
                  async () => undefined,
                );
              },
            },
          });
        });
      },
    },
  });
  const healthServer = createServer(async (request, response) => {
    if (request.url !== "/health/ready") {
      response.writeHead(404).end();
      return;
    }
    try {
      await database.checkReadiness();

      response.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          status: "ok",
          checkedAt: new Date().toISOString(),
          instanceId: process.env["THAAREI_FLEET_FIXTURE_ID"] ?? "local",
        }),
      );
    } catch {
      response.writeHead(503, { "content-type": "application/json" }).end(
        JSON.stringify({
          status: "degraded",
          checkedAt: new Date().toISOString(),
          instanceId: process.env["THAAREI_FLEET_FIXTURE_ID"] ?? "local",
        }),
      );
    }
  });
  healthServer.listen(environment.WORKER_PORT, "0.0.0.0");
  let shutdown: Promise<void> | null = null;
  const stop = (): Promise<void> => {
    shutdown ??= (async () => {
      await runner.stop();
      await new Promise<void>((resolveClose, rejectClose) =>
        healthServer.close((error) => (error ? rejectClose(error) : resolveClose())),
      );
      await database.close();
    })();
    return shutdown;
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => {
      void stop().catch(() => {
        process.exitCode = 1;
      });
    });
  try {
    await runner.promise;
  } finally {
    await stop();
  }
}

await startWorker();
