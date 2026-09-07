import { expect, test } from "vitest";
import { canBootstrapStrongFactor } from "@thaarei/core";
import {
  assuranceForCompletedAuthenticationPath,
  requiresRecentAccountAssurance,
} from "../src/index.js";

test("maps completed authentication routes to assurance levels", () => {
  expect(assuranceForCompletedAuthenticationPath("/passkey/verify-authentication")).toBe(
    "phishing_resistant",
  );
  expect(assuranceForCompletedAuthenticationPath("/two-factor/verify-totp")).toBe("multi_factor");
  expect(assuranceForCompletedAuthenticationPath("/two-factor/verify-backup-code")).toBe(
    "recovery",
  );
  expect(assuranceForCompletedAuthenticationPath("/sign-in/email")).toBe("single_factor");
});

test("requires recent assurance before recovery-code rotation", () => {
  expect(requiresRecentAccountAssurance("/two-factor/generate-backup-codes")).toBe(true);
});

test("allows only recent single-factor sessions to bootstrap the first strong factor", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  const recentPassword = {
    assurance: "single_factor" as const,
    authenticatedAt: "2026-09-06T11:59:00.000Z",
  };
  expect(canBootstrapStrongFactor(recentPassword, false, now)).toBe(true);
  expect(canBootstrapStrongFactor(recentPassword, true, now)).toBe(false);
  expect(
    canBootstrapStrongFactor(
      { ...recentPassword, authenticatedAt: "2026-09-06T11:00:00.000Z" },
      false,
      now,
    ),
  ).toBe(false);
  expect(
    canBootstrapStrongFactor(
      { assurance: "recovery", authenticatedAt: recentPassword.authenticatedAt },
      false,
      now,
    ),
  ).toBe(false);
});
