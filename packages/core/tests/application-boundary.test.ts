import { expect, test } from "vitest";
import {
  BudgetExceededError,
  ConflictError,
  ForbiddenError,
  PermanentWorkflowError,
  ProviderUnavailableError,
  RateLimitedError,
  ResourceNotFoundError,
  RetryableWorkflowError,
  UnauthenticatedError,
  ValidationError,
} from "../src/index.js";

test("normalized application errors expose only stable transport-independent codes", () => {
  const cases = [
    [new UnauthenticatedError(), "UNAUTHENTICATED"],
    [new ForbiddenError(), "FORBIDDEN"],
    [new ResourceNotFoundError(), "NOT_FOUND"],
    [new ConflictError(), "CONFLICT"],
    [new ValidationError(), "VALIDATION"],
    [new RateLimitedError(), "RATE_LIMITED"],
    [new BudgetExceededError(), "BUDGET_EXCEEDED"],
    [new ProviderUnavailableError(), "PROVIDER_UNAVAILABLE"],
    [new RetryableWorkflowError(), "RETRYABLE_WORKFLOW"],
    [new PermanentWorkflowError(), "PERMANENT_WORKFLOW"],
  ] as const;
  for (const [error, code] of cases) {
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
  }
});
