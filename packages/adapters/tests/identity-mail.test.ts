import { expect, test } from "vitest";
import { createIdentityMailAdapter } from "../src/index.js";

test("ZeptoMail identity adapter keeps credentials in the header and uses the Send API contract", async () => {
  let captured: { readonly url: string; readonly init: RequestInit } | undefined;
  const adapter = createIdentityMailAdapter({
    provider: "zeptomail",
    from: "security@fleet.example.test",
    zeptoMailApiKey: "test-agent-key",
    fetch: async (url, init) => {
      captured = { url: String(url), init: init ?? {} };
      return Response.json({ data: [{ code: "EM_104" }] }, { status: 201 });
    },
  });

  await adapter.sendVerification({
    email: "owner@example.test",
    url: "https://fleet.example.test/verify?token=opaque-token",
  });
  expect(captured?.url).toBe("https://api.zeptomail.in/v1.1/email");
  expect(new Headers(captured?.init.headers).get("authorization")).toBe(
    "Zoho-enczapikey test-agent-key",
  );
  const body = JSON.parse(String(captured?.init.body));
  expect(body).toMatchObject({
    from: { address: "security@fleet.example.test" },
    to: [{ email_address: { address: "owner@example.test" } }],
  });
  expect(body.client_reference).toBeUndefined();
});

test("Mailpit remains the credential-free development transport", async () => {
  let authorization: string | null = "unexpected";
  const adapter = createIdentityMailAdapter({
    provider: "mailpit",
    from: "identity@example.test",
    mailpitUrl: "http://mailpit:8025",
    fetch: async (_url, init) => {
      authorization = new Headers(init?.headers).get("authorization");
      return new Response(null, { status: 200 });
    },
  });
  await adapter.sendPasswordReset({
    email: "owner@example.test",
    url: "http://127.0.0.1:3000/reset?token=local",
  });
  expect(authorization).toBeNull();
});
