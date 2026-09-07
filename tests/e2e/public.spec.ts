import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("public web and typed API health remain reachable", async ({ page, request }) => {
  const navigation = await page.goto("/");
  expect(navigation?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Typed health" }).click();
  await expect(page.getByText("Request succeeded")).toBeVisible();
  const health = await request.get("/trpc/health");
  expect(health.ok()).toBe(true);
  const apiLive = await request.get(
    `http://127.0.0.1:${process.env.E2E_API_PORT ?? "3001"}/health/live`,
  );
  expect(apiLive.headers()["x-content-type-options"]).toBe("nosniff");
});

test("@a11y public page has no automatically detectable serious violations", async ({ page }) => {
  await page.goto("/");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
});

async function waitForVerificationUrl(email: string): Promise<string> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const response = await fetch("http://127.0.0.1:8025/api/v1/messages");
    if (response.ok) {
      const summary = (await response.json()) as {
        messages?: Array<{ ID?: string; To?: Array<{ Address?: string }> }>;
      };
      const id = summary.messages?.find((message) =>
        message.To?.some((recipient) => recipient.Address === email),
      )?.ID;
      if (id) {
        const detail = await fetch(
          `http://127.0.0.1:8025/api/v1/message/${encodeURIComponent(id)}`,
        );
        const message = (await detail.json()) as { HTML?: string };
        const url = message.HTML?.match(/href="([^"]+)"/u)?.[1]?.replaceAll("&amp;", "&");
        if (url) return url;
      }
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error("Verification message was not found in Mailpit");
}

test("identity verification, authorization, accessibility, and logout remain coherent", async ({
  page,
}) => {
  const email = `browser-${Date.now()}@example.test`;
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("local-password-123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();
  await page.goto(await waitForVerificationUrl(email));
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("local-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/signed in/i)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => fetch("/trpc/viewer").then((response) => response.status)))
    .toBe(200);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText(/signed out/i)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => fetch("/trpc/viewer").then((response) => response.status)))
    .toBe(401);
});

test("password recovery responses do not disclose account existence", async ({ request }) => {
  const email = `recovery-${Date.now()}@example.test`;
  const headers = { origin: `http://127.0.0.1:${process.env.E2E_WEB_PORT ?? "3000"}` };
  const signup = await request.post("/api/auth/sign-up/email", {
    headers,
    data: { name: "Recovery test", email, password: "local-password-123" },
  });
  expect(signup.status()).toBe(200);
  const existing = await request.post("/api/auth/request-password-reset", {
    headers,
    data: { email, redirectTo: "/" },
  });
  const absent = await request.post("/api/auth/request-password-reset", {
    headers,
    data: { email: `absent-${Date.now()}@example.test`, redirectTo: "/" },
  });
  expect(existing.status()).toBe(200);
  expect(absent.status()).toBe(existing.status());
  expect(await absent.json()).toEqual(await existing.json());
});

test("anonymous tenant context cannot cross the authorization boundary", async ({ request }) => {
  const response = await request.get("/trpc/viewer", {
    headers: { "x-organization-id": "other-tenant" },
  });
  expect(response.status()).toBe(401);
});
