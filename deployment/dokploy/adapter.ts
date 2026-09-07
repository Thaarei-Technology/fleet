import { mkdir, readFile, writeFile } from "node:fs/promises";

type Command = "plan" | "apply" | "inspect" | "promote" | "rollback" | "evidence";
const command = process.argv[2] as Command | undefined;
if (!command || !["plan", "apply", "inspect", "promote", "rollback", "evidence"].includes(command))
  throw new Error("Expected plan, apply, inspect, promote, rollback, or evidence");
const baseUrl = process.env.DOKPLOY_URL;
const apiKey = process.env.DOKPLOY_API_KEY;
if (!baseUrl || !apiKey) throw new Error("DOKPLOY_URL and DOKPLOY_API_KEY are required");
const definition = JSON.parse(await readFile("deployment/dokploy/services.json", "utf8")) as {
  serverVersion: { candidate: string; qualification: string };
  services: Array<{ name: string }>;
};
if (
  (command === "promote" || command === "apply") &&
  definition.serverVersion.qualification !== "qualified"
)
  throw new Error(
    "Dokploy candidate version has not passed its disposable live qualification suite",
  );
const environment = process.env.DOKPLOY_ENVIRONMENT;
if (command === "apply" && environment !== "staging")
  throw new Error("Dokploy apply is restricted to staging");
if (command === "promote" && environment !== "production")
  throw new Error("Dokploy promote is restricted to production");
if (command === "promote") {
  const approvalEvidenceId = process.env.APPROVAL_EVIDENCE_ID?.trim();
  const initiatingActor = process.env.INITIATING_ACTOR?.trim();
  const approvingActor = process.env.APPROVING_ACTOR?.trim();
  if (!approvalEvidenceId || !initiatingActor || !approvingActor)
    throw new Error(
      "Promotion requires approval evidence plus initiating and approving actor identities",
    );
  if (initiatingActor.toLocaleLowerCase("en-US") === approvingActor.toLocaleLowerCase("en-US"))
    throw new Error("Promotion approval must come from a different actor");
}
const request = async (path: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(new URL(`api/${path}`, baseUrl), {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": apiKey, ...init?.headers },
  });
  if (!response.ok) throw new Error(`Dokploy ${path} failed with HTTP ${response.status}`);
  if (response.status === 204) return [];
  const content = await response.text();
  return content ? JSON.parse(content) : null;
};
type JsonRecord = Record<string, unknown>;
type ApplicationState = { readonly dockerImage: string; readonly applicationStatus: string };
type DeploymentState = { readonly id: string; readonly status: string; readonly raw: JsonRecord };
const recordFrom = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Dokploy ${label} returned an invalid object`);
  return value as JsonRecord;
};
const applicationStateFrom = (value: unknown): ApplicationState => {
  const outer = recordFrom(value, "application.one");
  const application =
    outer.data && typeof outer.data === "object" && !Array.isArray(outer.data)
      ? (outer.data as JsonRecord)
      : outer;
  if (
    typeof application.dockerImage !== "string" ||
    typeof application.applicationStatus !== "string"
  ) {
    throw new Error("Dokploy application.one omitted dockerImage or applicationStatus");
  }
  return { dockerImage: application.dockerImage, applicationStatus: application.applicationStatus };
};
const inspectApplication = async (applicationId: string): Promise<ApplicationState> =>
  applicationStateFrom(
    await request(`application.one?applicationId=${encodeURIComponent(applicationId)}`),
  );
const deploymentsFrom = (value: unknown): readonly DeploymentState[] => {
  const raw = Array.isArray(value)
    ? value
    : (() => {
        const outer = recordFrom(value, "deployment.all");
        return Array.isArray(outer.data) ? outer.data : null;
      })();
  if (!raw) throw new Error("Dokploy deployment.all omitted its deployment list");
  return raw.map((entry) => {
    const deployment = recordFrom(entry, "deployment.all entry");
    const id =
      typeof deployment.deploymentId === "string"
        ? deployment.deploymentId
        : typeof deployment.id === "string"
          ? deployment.id
          : null;
    if (!id || typeof deployment.status !== "string")
      throw new Error("Dokploy deployment record omitted id or status");
    return { id, status: deployment.status, raw: deployment };
  });
};
const failedStatuses = new Set(["cancelled", "error", "failed"]);
const waitForDeployment = async (
  applicationId: string,
  immutableImage: string,
  previousDeploymentIds: ReadonlySet<string>,
): Promise<{ readonly deployment: DeploymentState; readonly application: ApplicationState }> => {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const deployments = deploymentsFrom(
      await request(`deployment.all?applicationId=${encodeURIComponent(applicationId)}`),
    );
    const deployment = deployments.find((candidate) => !previousDeploymentIds.has(candidate.id));
    if (deployment) {
      const status = deployment.status.toLocaleLowerCase("en-US");
      if (failedStatuses.has(status))
        throw new Error(
          `Dokploy deployment ${deployment.id} failed with status ${deployment.status}`,
        );
      if (status === "done") {
        const application = await inspectApplication(applicationId);
        if (
          application.dockerImage !== immutableImage ||
          application.applicationStatus !== "done"
        ) {
          throw new Error(
            "Dokploy completed deployment does not match the requested active immutable image",
          );
        }
        return { deployment, application };
      }
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 2_000));
  }
  throw new Error("Dokploy deployment did not reach the requested immutable image before timeout");
};
const evidence: unknown[] = [];
for (const service of definition.services) {
  const key = service.name.toUpperCase().replaceAll("-", "_");
  const applicationId = process.env[`DOKPLOY_${key}_APPLICATION_ID`];
  const digest = process.env[`RELEASE_${key}_DIGEST`];
  const image = process.env[`RELEASE_${key}_IMAGE`];
  const immutableImage = image && digest ? `${image}@${digest}` : null;
  if (!applicationId) throw new Error(`Missing DOKPLOY_${key}_APPLICATION_ID`);
  if (["apply", "promote"].includes(command) && (!digest || !/^sha256:[a-f0-9]{64}$/u.test(digest)))
    throw new Error(`Missing immutable RELEASE_${key}_DIGEST`);
  if (
    ["apply", "promote"].includes(command) &&
    (!image || image.includes("@") || /\s/u.test(image))
  )
    throw new Error(`Missing digest-free RELEASE_${key}_IMAGE`);
  if (command === "promote" && process.env[`STAGING_${key}_DIGEST`] !== digest)
    throw new Error(
      `Production digest for ${service.name} does not match the staging-tested digest`,
    );
  if (command === "promote" && process.env[`ATTESTATION_${key}_VERIFIED`] !== "true")
    throw new Error(`Attestation for ${service.name} has not been verified`);
  const deployments = await request(
    `deployment.all?applicationId=${encodeURIComponent(applicationId)}`,
  );
  const deploymentStates = deploymentsFrom(deployments);
  const currentApplication = await inspectApplication(applicationId);
  if (command === "plan" || command === "inspect" || command === "evidence")
    evidence.push({
      service: service.name,
      applicationId,
      desiredImage: immutableImage,
      currentApplication,
      deployments,
    });
  if (command === "apply" || command === "promote") {
    if (!immutableImage) throw new Error(`Missing immutable image for ${service.name}`);
    if (
      currentApplication.dockerImage === immutableImage &&
      currentApplication.applicationStatus === "done"
    ) {
      evidence.push({
        service: service.name,
        status: "unchanged",
        image: immutableImage,
        application: currentApplication,
      });
    } else {
      const previousDeploymentIds = new Set(deploymentStates.map((deployment) => deployment.id));
      await request("application.update", {
        method: "POST",
        body: JSON.stringify({ applicationId, dockerImage: immutableImage }),
      });
      const accepted = await request("application.deploy", {
        method: "POST",
        body: JSON.stringify({
          applicationId,
          title: `Promote ${digest}`,
          description: "Thaarei immutable release deployment",
        }),
      });
      const active = await waitForDeployment(applicationId, immutableImage, previousDeploymentIds);
      evidence.push({
        service: service.name,
        status: "deployed",
        image: immutableImage,
        accepted,
        ...active,
      });
    }
  }
  if (command === "rollback") {
    const rollbackId =
      process.env[`ROLLBACK_${key}_ID`] ?? process.env[`ROLLBACK_${key}_DEPLOYMENT_ID`];
    const previousDigest = process.env[`ROLLBACK_${key}_DIGEST`];
    const previousImage = image && previousDigest ? `${image}@${previousDigest}` : null;
    if (
      !rollbackId ||
      !previousDigest ||
      !/^sha256:[a-f0-9]{64}$/u.test(previousDigest) ||
      !previousImage
    )
      throw new Error(
        "Rollback requires a release-manifest rollback id, image, and compatible previous digest",
      );
    if (
      process.env.ROLLBACK_SCHEMA_COMPATIBLE !== "true" ||
      process.env.ROLLBACK_ATTESTATION_VERIFIED !== "true"
    )
      throw new Error("Rollback requires schema-compatibility and attestation evidence");
    const previousDeploymentIds = new Set(deploymentStates.map((deployment) => deployment.id));
    const accepted = await request("rollback.rollback", {
      method: "POST",
      body: JSON.stringify({ rollbackId }),
    });
    const active = await waitForDeployment(applicationId, previousImage, previousDeploymentIds);
    evidence.push({
      service: service.name,
      status: "rolled-back",
      image: previousImage,
      accepted,
      ...active,
    });
  }
}
const record = {
  schemaVersion: 1,
  command,
  environment: environment ?? null,
  sourceCommit: process.env.GITHUB_SHA ?? null,
  approval:
    command === "promote"
      ? {
          evidenceId: process.env.APPROVAL_EVIDENCE_ID,
          initiatingActor: process.env.INITIATING_ACTOR,
          approvingActor: process.env.APPROVING_ACTOR,
        }
      : null,
  observedAt: new Date().toISOString(),
  results: evidence,
};
await mkdir(".artifacts/deployment", { recursive: true });
await writeFile(".artifacts/deployment/dokploy.json", `${JSON.stringify(record, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(record)}\n`);
