import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checkedAt: z.string().datetime(),
  instanceId: z.string().min(1),
  detail: z.string().optional(),
  failedDependency: z.string().optional(),
});
export const problemDetailsSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.number().int().min(100).max(599),
  detail: z.string().optional(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export const jobPayloadSchema = z.object({
  kind: z.literal("starter.health"),
  requestId: z.string().min(1),
});
export type JobPayload = z.infer<typeof jobPayloadSchema>;

export const foundationProbeEventSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1).optional(),
    type: z.literal("fleet.foundation.probe.requested.v1"),
    schemaVersion: z.literal(1),
    aggregateType: z.literal("foundation-probe"),
    aggregateId: z.string().min(1),
    payload: z.object({ requestId: z.string().min(1) }).strict(),
    occurredAt: z.string().datetime(),
    correlationId: z.string().min(1),
    causationId: z.string().min(1).optional(),
  })
  .strict();
export type FoundationProbeEvent = z.infer<typeof foundationProbeEventSchema>;
