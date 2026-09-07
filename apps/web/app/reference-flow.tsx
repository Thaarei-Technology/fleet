"use client";

import { useMemo, useState } from "react";
import { authClient, createApiClient, type OrganizationSummary } from "@thaarei/api-client";

export function ReferenceFlow() {
  const [message, setMessage] = useState("Ready");
  const [result, setResult] = useState<unknown>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<readonly OrganizationSummary[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const api = useMemo(
    () => createApiClient({ getOrganizationId: () => selectedOrganizationId }),
    [selectedOrganizationId],
  );
  const run = async (operation: () => Promise<unknown>): Promise<void> => {
    try {
      setResult(await operation());
      setMessage("Request succeeded");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    }
  };
  const health = () => run(() => api.health.query());
  const viewer = () => run(() => api.viewer.query());

  async function loadOrganizations(): Promise<void> {
    try {
      const available = await api.organizations.list.query();
      setOrganizations(available);
      setMessage("Organizations loaded; choose an organization to establish request context.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Organizations could not be loaded");
    }
  }

  async function switchOrganization(organizationId: string): Promise<void> {
    if (!organizationId) return;
    try {
      const selected = await api.organizations.switch.mutate({ organizationId });
      setSelectedOrganizationId(selected.organizationId);
      setMessage("Organization context switched and membership was revalidated by the server.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Organization switch was denied");
    }
  }

  const [email, setEmail] = useState("developer@example.test");
  const [password, setPassword] = useState("local-password-123");
  async function signUp(email: string, password: string): Promise<void> {
    const result = await authClient.signUp.email({ email, password, name: "Starter Developer" });
    setMessage(
      result.error
        ? (result.error.message ?? "Signup failed")
        : "Signup accepted; check your email to verify the account.",
    );
  }
  async function signIn(email: string, password: string): Promise<void> {
    const result = await authClient.signIn.email({ email, password });
    setMessage(
      result.error
        ? (result.error.message ?? "Signin failed")
        : "Signed in; session cookie established.",
    );
  }
  async function signOut(): Promise<void> {
    const result = await authClient.signOut();
    setMessage(
      result.error ? (result.error.message ?? "Signout failed") : "Signed out; session revoked.",
    );
  }

  async function sendVerificationEmail(): Promise<void> {
    const response = await authClient.sendVerificationEmail({
      email,
      callbackURL: window.location.origin,
    });
    setMessage(
      response.error
        ? (response.error.message ?? "Verification email could not be sent")
        : "Verification email requested; check your email.",
    );
  }

  async function requestPasswordRecovery(): Promise<void> {
    const response = await authClient.requestPasswordReset({
      email,
      redirectTo: window.location.origin,
    });
    setMessage(
      response.error
        ? (response.error.message ?? "Password recovery could not be requested")
        : "Password recovery requested; check your email.",
    );
  }

  async function resetPassword(): Promise<void> {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setMessage("Open the single-use reset link from your email before resetting the password.");
      return;
    }
    const response = await authClient.resetPassword({ newPassword: password, token });
    setMessage(
      response.error
        ? (response.error.message ?? "Password reset failed")
        : "Password reset; sign in again.",
    );
  }

  async function listSessions(): Promise<void> {
    const response = await authClient.listSessions();
    setResult(response.data ?? response.error ?? null);
    setMessage(
      response.error
        ? (response.error.message ?? "Sessions could not be listed")
        : "Active sessions loaded.",
    );
  }

  async function revokeSession(): Promise<void> {
    if (!sessionToken.trim()) {
      setMessage("Enter the opaque session token returned by the active-session listing.");
      return;
    }
    const response = await authClient.revokeSession({ token: sessionToken });
    setMessage(
      response.error
        ? (response.error.message ?? "Session could not be revoked")
        : "Session revoked.",
    );
    setSessionToken("");
  }

  async function revokeAllSessions(): Promise<void> {
    const response = await authClient.revokeSessions();
    setMessage(
      response.error
        ? (response.error.message ?? "Sessions could not be revoked")
        : "All sessions revoked.",
    );
  }

  return (
    <main>
      <h1>{"Thaarei Fleet"} reference flow</h1>
      <p>This is demonstrative starter code, not a product UI.</p>
      <button type="button" onClick={health}>
        Typed health
      </button>
      <button type="button" onClick={viewer}>
        Viewer (401 until signed in)
      </button>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="button" onClick={() => signUp(email, password)}>
        Sign up
      </button>
      <button type="button" onClick={() => signIn(email, password)}>
        Sign in
      </button>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
      <button type="button" onClick={sendVerificationEmail}>
        Send verification email
      </button>
      <button type="button" onClick={requestPasswordRecovery}>
        Request password recovery
      </button>
      <button type="button" onClick={resetPassword}>
        Reset password from email link
      </button>
      <section aria-labelledby="organization-heading">
        <h2 id="organization-heading">Organization context</h2>
        <button type="button" onClick={loadOrganizations}>
          Load organizations
        </button>
        <label>
          Organization
          <select
            value={selectedOrganizationId ?? ""}
            onChange={(event) => void switchOrganization(event.target.value)}
          >
            <option value="">Choose an organization</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section aria-labelledby="sessions-heading">
        <h2 id="sessions-heading">Active sessions</h2>
        <button type="button" onClick={listSessions}>
          List active sessions
        </button>
        <label>
          Session token
          <input
            value={sessionToken}
            onChange={(event) => setSessionToken(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button type="button" onClick={revokeSession}>
          Revoke session
        </button>
        <button type="button" onClick={revokeAllSessions}>
          Revoke all sessions
        </button>
      </section>
      <p>{message}</p>
      <pre>{result ? JSON.stringify(result, null, 2) : "No result yet"}</pre>
    </main>
  );
}
