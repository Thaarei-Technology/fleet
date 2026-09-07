import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@thaarei/api";
import { createAuthClient } from "better-auth/client";

export type { OrganizationSummary, SessionSummary } from "@thaarei/api";

export interface ApiClientOptions {
  /** The current organization is request context, not persisted browser state. */
  readonly getOrganizationId?: () => string | null;
}

export function createApiClient(options: ApiClientOptions = {}) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/trpc",
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          const organizationId = options.getOrganizationId?.() ?? null;
          if (organizationId) headers.set("x-organization-id", organizationId);
          else headers.delete("x-organization-id");
          return fetch(input, {
            ...init,
            headers,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
export const authClient = createAuthClient({
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
});
