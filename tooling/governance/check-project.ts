import { readFile } from "node:fs/promises";

const project = JSON.parse(await readFile(".thaarei/project.json", "utf8")) as Record<
  string,
  unknown
>;
const expectedKeys = [
  "$schema",
  "schemaVersion",
  "initializedAt",
  "starterVersion",
  "productId",
  "clientId",
  "displayName",
  "packageScope",
  "profiles",
  "services",
  "environments",
  "deployment",
  "owners",
  "generatedFiles",
].sort();
if (JSON.stringify(Object.keys(project).sort()) !== JSON.stringify(expectedKeys))
  throw new Error("project metadata has unknown or missing fields");
const expectedProfiles = [
  "web",
  "api",
  "data",
  "identity",
  "tenancy",
  "jobs",
  "events",
  "cache",
  "rate-limit",
];
const expectedServices = ["web", "api", "worker"];
const expectedEnvironments = ["development", "test", "staging", "production"];
if (
  project.$schema !== "../tooling/governance/project.schema.json" ||
  project.schemaVersion !== 2 ||
  project.starterVersion !== "1.0.0-dev.1"
)
  throw new Error("project metadata schema or starter version drifted");
if (JSON.stringify(project.profiles) !== JSON.stringify(expectedProfiles))
  throw new Error("project capability metadata drifted");
if (JSON.stringify(project.services) !== JSON.stringify(expectedServices))
  throw new Error("project service metadata drifted");
if (JSON.stringify(project.environments) !== JSON.stringify(expectedEnvironments))
  throw new Error("project environment metadata drifted");
const deployment = project.deployment as Record<string, unknown> | undefined;
if (
  !deployment ||
  JSON.stringify(Object.keys(deployment).sort()) !== JSON.stringify(["target", "topology"]) ||
  deployment.target !== "dokploy" ||
  deployment.topology !== "standard"
)
  throw new Error("project deployment metadata drifted");
const owners = project.owners as Record<string, unknown> | undefined;
if (
  !owners ||
  typeof owners.technical !== "string" ||
  !owners.technical ||
  typeof owners.operations !== "string" ||
  !owners.operations
)
  throw new Error("project ownership metadata is invalid");
if (!Array.isArray(project.generatedFiles))
  throw new Error("project generatedFiles must be an array");
const invalidGeneratedPath = project.generatedFiles.find(
  (path) =>
    typeof path !== "string" || !path || path.startsWith("/") || path.split("/").includes(".."),
);
if (invalidGeneratedPath !== undefined)
  throw new Error(`project generated-file path is invalid: ${String(invalidGeneratedPath)}`);
if (new Set(project.generatedFiles).size !== project.generatedFiles.length)
  throw new Error("project generated-file metadata contains duplicates");
process.stdout.write("Project metadata is valid\n");
