import { expect, test } from "vitest";
import {
  assuranceForMethod,
  canPerformSensitiveAccountChange,
  identitySecurityPolicy,
} from "../src/index.js";

test("maps authentication methods to explicit assurance and restricts recovery", () => {
  expect(assuranceForMethod("password_totp")).toBe("multi_factor");
  expect(assuranceForMethod("passkey")).toBe("phishing_resistant");
  expect(assuranceForMethod("recovery_code")).toBe("recovery");
  const now = new Date("2026-09-05T00:04:00.000Z");
  expect(
    canPerformSensitiveAccountChange(
      { assurance: "phishing_resistant", authenticatedAt: "2026-09-05T00:00:00.000Z" },
      now,
    ),
  ).toBe(true);
  expect(
    canPerformSensitiveAccountChange(
      { assurance: "recovery", authenticatedAt: "2026-09-05T00:04:00.000Z" },
      now,
    ),
  ).toBe(false);
  expect(identitySecurityPolicy.trustedDeviceBypass).toBe(false);
  expect(identitySecurityPolicy.revokeAllSessionsAfterReset).toBe(true);
});
