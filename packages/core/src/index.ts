import { z } from "zod";

export type GovernanceRole = "owner" | "admin" | "member";
export type Permission = string & { readonly __brand: "Permission" };
/**
 * SOURCE OF TRUTH ID: starter.core.application-boundary
 * SOURCE OF TRUTH KEYWORDS: actor-context, authorization, application-service, core-errors
 *
 * WHAT: Provider-neutral application invocation context, authorization port, and error taxonomy.
 * WHY: Transports and workers need a shared, authenticated context without deciding domain policy or leaking infrastructure errors.
 * WHEN: Every authenticated command or query entering a core application service.
 * HOW: ActorContext
 * BOUNDARIES: Core defines policy contracts and normalized errors; transports map errors and adapters implement ports.
 */
export interface ActorContext {
  readonly subjectId: string;
  readonly organizationId?: string;
  readonly membershipId?: string;
  readonly governanceRole?: GovernanceRole;
  readonly permissions: readonly Permission[];
  readonly productRoles: readonly string[];
  readonly correlationId: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
}
export interface PublicContext {
  readonly correlationId: string;
  readonly traceId?: string;
}
export interface ResourceDescriptor {
  readonly type: string;
  readonly id: string;
  readonly organizationId?: string;
  readonly owningSubjectId?: string;
  readonly owningMembershipId?: string;
  readonly visibility?: "draft" | "published" | "private" | "public";
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}
export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}
export interface AuthorizationService {
  authorize(
    actor: ActorContext,
    permission: Permission,
    resource: ResourceDescriptor,
  ): Promise<AuthorizationDecision>;
}
export abstract class CoreError extends Error {
  abstract readonly code: string;
}
export class UnauthenticatedError extends CoreError {
  readonly code = "UNAUTHENTICATED";
}
export class ForbiddenError extends CoreError {
  readonly code = "FORBIDDEN";
}
export class ResourceNotFoundError extends CoreError {
  readonly code = "NOT_FOUND";
}
export class ConflictError extends CoreError {
  readonly code = "CONFLICT";
}
export class ValidationError extends CoreError {
  readonly code = "VALIDATION";
}
export class RateLimitedError extends CoreError {
  readonly code = "RATE_LIMITED";
}
export class BudgetExceededError extends CoreError {
  readonly code = "BUDGET_EXCEEDED";
}
export class ProviderUnavailableError extends CoreError {
  readonly code = "PROVIDER_UNAVAILABLE";
}
export class RetryableWorkflowError extends CoreError {
  readonly code = "RETRYABLE_WORKFLOW";
}
export class PermanentWorkflowError extends CoreError {
  readonly code = "PERMANENT_WORKFLOW";
}
export type AssuranceLevel =
  | "anonymous"
  | "single_factor"
  | "multi_factor"
  | "phishing_resistant"
  | "recovery";
export type AuthenticationMethod = "password" | "password_totp" | "passkey" | "recovery_code";
export interface AuthenticationSession {
  readonly subjectId: string;
  readonly assurance: AssuranceLevel;
  readonly authenticatedAt: string;
}
export interface AuthenticationPort {
  resolveSession(headers: Headers): Promise<AuthenticationSession | null>;
  listSessions(headers: Headers): Promise<readonly unknown[]>;
  revokeSession(headers: Headers, token: string): Promise<void>;
  revokeAllSessions(headers: Headers): Promise<void>;
}
export interface IdentityRepository {
  ensureAuthenticationSubject(
    authenticationSubjectId: string,
  ): Promise<{ readonly subjectId: string }>;
  resolveAuthenticationSubject(
    authenticationSubjectId: string,
  ): Promise<{ readonly subjectId: string } | null>;
}
export interface IdentityMailPort {
  sendVerification(input: { readonly email: string; readonly url: string }): Promise<void>;
  sendPasswordReset(input: { readonly email: string; readonly url: string }): Promise<void>;
}
export const assuranceForMethod = (method: AuthenticationMethod): AssuranceLevel =>
  ({
    password: "single_factor",
    password_totp: "multi_factor",
    passkey: "phishing_resistant",
    recovery_code: "recovery",
  })[method] as AssuranceLevel;
export function canPerformSensitiveAccountChange(
  input: { readonly assurance: AssuranceLevel; readonly authenticatedAt: string },
  now = new Date(),
  maximumAgeMs = 5 * 60 * 1000,
): boolean {
  if (
    input.assurance === "anonymous" ||
    input.assurance === "single_factor" ||
    input.assurance === "recovery"
  )
    return false;
  const age = now.getTime() - Date.parse(input.authenticatedAt);
  return Number.isFinite(age) && age >= 0 && age <= maximumAgeMs;
}
export function canBootstrapStrongFactor(
  input: { readonly assurance: AssuranceLevel; readonly authenticatedAt: string },
  hasExistingStrongFactor: boolean,
  now = new Date(),
  maximumAgeMs = 5 * 60 * 1000,
): boolean {
  if (hasExistingStrongFactor || input.assurance !== "single_factor") return false;
  const age = now.getTime() - Date.parse(input.authenticatedAt);
  return Number.isFinite(age) && age >= 0 && age <= maximumAgeMs;
}
export const identitySecurityPolicy = Object.freeze({
  requireVerifiedEmail: true,
  resetTokenSingleUse: true,
  resetTokenExpiresInSeconds: 3600,
  enumerationSafeResponses: true,
  revokeAllSessionsAfterReset: true,
  loginRequiredAfterReset: true,
  rotateSessionAfterAuthenticationOrAssuranceChange: true,
  trustedDeviceBypass: false,
  rateLimitedOperations: ["login", "email-verification", "password-recovery"] as const,
});
export interface WorkflowStore {
  begin(
    idempotencyKey: string,
    claimToken: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<boolean>;
  complete(idempotencyKey: string, claimToken: string): Promise<void>;
  fail(idempotencyKey: string, claimToken: string): Promise<void>;
}
/**
 * SOURCE OF TRUTH ID: starter.jobs.workflow-policy
 * SOURCE OF TRUTH KEYWORDS: jobs, idempotency, retry, workflow
 *
 * WHAT: Retry-safe workflow claim and completion policy.
 * WHY: Failed jobs must release their claim while completed work remains deduplicated.
 * WHEN: Wrap every durable task effect at the worker boundary.
 * HOW: runIdempotentWorkflow
 * BOUNDARIES: Persistence implements the state transitions; callers do not bypass this policy.
 */
export async function runIdempotentWorkflow(
  store: WorkflowStore,
  idempotencyKey: string,
  effect: () => Promise<void>,
  options: {
    readonly now?: () => Date;
    readonly leaseMilliseconds?: number;
    readonly claimToken?: () => string;
  } = {},
): Promise<"completed" | "duplicate"> {
  const now = (options.now ?? (() => new Date()))();
  const leaseMilliseconds = options.leaseMilliseconds ?? 5 * 60 * 1000;
  if (!Number.isSafeInteger(leaseMilliseconds) || leaseMilliseconds <= 0)
    throw new Error("Workflow lease must be a positive safe integer");
  const claimToken = (options.claimToken ?? (() => crypto.randomUUID()))();
  if (!claimToken) throw new Error("Workflow claim token must be non-empty");
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  if (!(await store.begin(idempotencyKey, claimToken, now, leaseExpiresAt))) return "duplicate";
  try {
    await effect();
    await store.complete(idempotencyKey, claimToken);
    return "completed";
  } catch (error: unknown) {
    await store.fail(idempotencyKey, claimToken);
    throw error;
  }
}
export interface DomainEvent<TPayload> {
  readonly id: string;
  readonly organizationId?: string;
  readonly type: string;
  readonly schemaVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: TPayload;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly causationId?: string;
}
export interface OutboxPort {
  append<TPayload>(
    event: DomainEvent<TPayload>,
    destination: string,
    idempotencyKey: string,
  ): Promise<void>;
}
export interface OutboxDeliveryPort {
  claim(
    eventId: string,
    leaseOwner: string,
    now: Date,
    leaseMilliseconds: number,
  ): Promise<{
    readonly fencingToken: number;
    readonly attemptNumber: number;
    readonly destination: string;
    readonly event: DomainEvent<Record<string, unknown>>;
  } | null>;
  recordAttempt(
    eventId: string,
    fencingToken: number,
    outcome: "delivered" | "retry" | "dead_letter",
    failure?: string,
  ): Promise<void>;
  markDelivered(eventId: string, fencingToken: number): Promise<void>;
  replay(eventId: string, actorSubjectId: string): Promise<void>;
}
export const domainEventSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1).optional(),
    type: z.string().min(1),
    schemaVersion: z.number().int().positive(),
    aggregateType: z.string().min(1),
    aggregateId: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
    occurredAt: z.string().datetime(),
    correlationId: z.string().min(1),
    causationId: z.string().min(1).optional(),
  })
  .strict();
export function retryDelayMilliseconds(attemptNumber: number, randomValue = 0.5): number {
  if (
    !Number.isSafeInteger(attemptNumber) ||
    attemptNumber < 1 ||
    !Number.isFinite(randomValue) ||
    randomValue < 0 ||
    randomValue > 1
  )
    throw new Error("Invalid outbox retry input");
  const exponential = Math.min(15 * 60 * 1000, 1000 * 2 ** Math.min(attemptNumber - 1, 10));
  return Math.min(15 * 60 * 1000, Math.floor(exponential * (0.5 + randomValue)));
}
export function isCurrentFencingToken(expected: number, actual: number): boolean {
  return Number.isSafeInteger(expected) && expected > 0 && actual === expected;
}
export function validateDomainEvent(value: unknown): DomainEvent<Record<string, unknown>> {
  return domainEventSchema.parse(value) as DomainEvent<Record<string, unknown>>;
}
/**
 * SOURCE OF TRUTH ID: starter.tenancy.authorization-policy
 * SOURCE OF TRUTH KEYWORDS: tenancy, authorization, organization, permission, deny-by-default
 *
 * WHAT: Organization-scoped authorization policy that separates governance roles from product permissions.
 * WHY: Tenant isolation and server-side authorization must remain authoritative even when a client sends a guessed resource identifier.
 * WHEN: Every organization-scoped application service authorizes an actor before loading or mutating a resource.
 * HOW: DefaultAuthorizationService
 * BOUNDARIES: The policy owns decisions only; database repositories enforce persistence constraints and transports only map the result.
 */
export class DefaultAuthorizationService implements AuthorizationService {
  async authorize(
    actor: ActorContext,
    permission: Permission,
    resource: ResourceDescriptor,
  ): Promise<AuthorizationDecision> {
    if (!actor.subjectId || !actor.organizationId)
      return { allowed: false, reason: "organization-context-required" };
    if (resource.organizationId !== undefined && resource.organizationId !== actor.organizationId)
      return { allowed: false, reason: "organization-mismatch" };
    if (actor.governanceRole === "owner") return { allowed: true };
    if (
      actor.governanceRole === "admin" &&
      permission !== ("organization.owner.manage" as Permission)
    )
      return { allowed: true };
    return actor.permissions.includes(permission)
      ? { allowed: true }
      : { allowed: false, reason: "permission-required" };
  }
}
export interface InvitationDecision {
  readonly valid: boolean;
  readonly reason?: "expired" | "revoked" | "accepted" | "invalid-role";
}
export function validateInvitation(input: {
  readonly status: "pending" | "accepted" | "revoked" | "expired";
  readonly expiresAt: Date;
  readonly now: Date;
  readonly governanceRole: GovernanceRole;
}): InvitationDecision {
  if (input.status === "accepted") return { valid: false, reason: "accepted" };
  if (input.status === "revoked") return { valid: false, reason: "revoked" };
  if (input.status === "expired" || input.expiresAt.getTime() <= input.now.getTime())
    return { valid: false, reason: "expired" };
  if (!["owner", "admin", "member"].includes(input.governanceRole))
    return { valid: false, reason: "invalid-role" };
  return { valid: true };
}
/**
 * SOURCE OF TRUTH ID: starter.cache.port
 * SOURCE OF TRUTH KEYWORDS: cache, ttl, invalidation, typed-value
 *
 * WHAT: Provider-neutral cache port with bounded TTL and explicit invalidation semantics.
 * WHY: Cache outages must not change authorization or durable business truth, and cached values require caller validation.
 * WHEN: A read model or risk-tolerant computation can be cached without replacing the source of truth.
 * HOW: cacheTtlForRisk
 * BOUNDARIES: Adapters implement storage; core owns TTL policy and callers own value parsing.
 */
export type CacheRisk = "public" | "authenticated" | "tenant" | "sensitive";
export interface CachePort {
  get<T>(key: string, parse: (value: unknown) => T): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}
export function cacheTtlForRisk(risk: CacheRisk): number {
  const values: Record<CacheRisk, number> = {
    public: 300,
    authenticated: 60,
    tenant: 30,
    sensitive: 0,
  };
  return values[risk];
}
export function cacheKey(organizationId: string | null, namespace: string, key: string): string {
  if (!organizationId || !namespace || !key || key.includes("..") || key.startsWith("/"))
    throw new Error("Invalid cache key");
  return [namespace, organizationId, key].join(":");
}
/**
 * SOURCE OF TRUTH ID: starter.rate-limit.policy
 * SOURCE OF TRUTH KEYWORDS: rate-limit, risk, distributed, fail-closed
 *
 * WHAT: Risk-based rate-limit decision policy independent of the backing counter.
 * WHY: Abuse controls must be stricter for sensitive or mutating actions and cannot be bypassed by a UI-only check.
 * WHEN: At the application boundary before an expensive, mutating, or provider-backed operation.
 * HOW: evaluateRateLimit
 * BOUNDARIES: Adapters provide atomic distributed counters; this policy never grants permissions.
 */
export type RateLimitRisk = "read" | "write" | "auth" | "provider";
export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}
export function evaluateRateLimit(input: {
  readonly risk: RateLimitRisk;
  readonly count: number;
  readonly nowEpochSeconds: number;
  readonly windowSeconds?: number;
}): RateLimitDecision {
  const limits: Record<RateLimitRisk, number> = { read: 120, write: 30, auth: 10, provider: 5 };
  const windowSeconds = input.windowSeconds ?? 60;
  if (
    !Number.isSafeInteger(input.count) ||
    input.count < 0 ||
    !Number.isSafeInteger(windowSeconds) ||
    windowSeconds <= 0
  )
    throw new Error("Invalid rate-limit counter");
  const limit = limits[input.risk];
  return {
    allowed: input.count < limit,
    remaining: Math.max(0, limit - input.count - 1),
    retryAfterSeconds:
      input.count < limit
        ? 0
        : windowSeconds - (Math.max(0, input.nowEpochSeconds) % windowSeconds),
  };
}
