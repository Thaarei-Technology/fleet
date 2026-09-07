import { expect, test } from "vitest";
import { appRouter, createContext } from "../src/index.js";

test("protected procedures reject anonymous callers", async () => {
  const caller = appRouter.createCaller(createContext(null));
  await expect(caller.viewer()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(caller.organizations.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  await expect(caller.sessions.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("organization selection revalidates membership and returns only the selected context", async () => {
  const memberships = new Set(["org-a"]);
  const caller = appRouter.createCaller(
    createContext("subject-1", null, {
      organizationAuthorization: {
        hasMembership: async (organizationId) => memberships.has(organizationId),
        listOrganizations: async () => [{ id: "org-a", name: "Alpha" }],
      },
    }),
  );

  await expect(caller.organizations.list()).resolves.toEqual([{ id: "org-a", name: "Alpha" }]);
  await expect(caller.organizations.switch({ organizationId: "org-a" })).resolves.toEqual({
    organizationId: "org-a",
  });
  await expect(caller.organizations.switch({ organizationId: "org-b" })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

test("organization selection rejects malformed identifiers before authorization", async () => {
  const hasMembership = async () => {
    throw new Error("must not be called");
  };
  const caller = appRouter.createCaller(
    createContext("subject-1", null, {
      organizationAuthorization: { hasMembership, listOrganizations: async () => [] },
    }),
  );

  await expect(caller.organizations.switch({ organizationId: "   " })).rejects.toMatchObject({
    code: "BAD_REQUEST",
  });
});

test("session revoke contract delegates to the authenticated session owner", async () => {
  const calls: string[] = [];
  const caller = appRouter.createCaller(
    createContext("subject-1", null, {
      sessionOperations: {
        list: async () => [
          {
            id: "session-1",
            token: "opaque-token",
            createdAt: "2026-09-07T00:00:00.000Z",
            updatedAt: "2026-09-07T00:00:00.000Z",
            expiresAt: "2026-09-08T00:00:00.000Z",
            ipAddress: null,
            userAgent: "test",
          },
        ],
        revoke: async (token) => calls.push(`revoke:${token}`),
        revokeAll: async () => calls.push("revoke-all"),
      },
    }),
  );

  await expect(caller.sessions.list()).resolves.toHaveLength(1);
  await expect(caller.sessions.revoke({ token: "opaque-token" })).resolves.toEqual({
    revoked: true,
  });
  await expect(caller.sessions.revokeAll()).resolves.toEqual({ revoked: true });
  expect(calls).toEqual(["revoke:opaque-token", "revoke-all"]);
});
