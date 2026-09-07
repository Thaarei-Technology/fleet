import { foundationProbeEventSchema } from "@thaarei/contracts";
import type { OutboxDeliveryPort } from "@thaarei/core";

export interface FleetOutboxHandlers {
  readonly recordFoundationProbe: (requestId: string) => Promise<void>;
}

export async function dispatchOutboxEvent(input: {
  readonly outbox: OutboxDeliveryPort;
  readonly eventId: string;
  readonly leaseOwner: string;
  readonly handlers: FleetOutboxHandlers;
  readonly now?: Date;
}): Promise<"delivered" | "not_claimed"> {
  const claim = await input.outbox.claim(
    input.eventId,
    input.leaseOwner,
    input.now ?? new Date(),
    60_000,
  );
  if (!claim) return "not_claimed";
  try {
    switch (claim.event.type) {
      case "fleet.foundation.probe.requested.v1": {
        const event = foundationProbeEventSchema.parse(claim.event);
        await input.handlers.recordFoundationProbe(event.payload.requestId);
        break;
      }
      default:
        throw new Error(`No outbox handler for event type: ${claim.event.type}`);
    }
    await input.outbox.recordAttempt(input.eventId, claim.fencingToken, "delivered");
    await input.outbox.markDelivered(input.eventId, claim.fencingToken);
    return "delivered";
  } catch (error: unknown) {
    const failure = error instanceof Error ? error.message : "Unknown outbox dispatch failure";
    await input.outbox.recordAttempt(input.eventId, claim.fencingToken, "retry", failure);
    throw error;
  }
}
