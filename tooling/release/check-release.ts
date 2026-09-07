import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { builtinModules } from "node:module";

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) &&
  Object.values(value).every((item) => typeof item === "string" && item.length > 0);
const isDateTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) &&
  !Number.isNaN(Date.parse(value));
const hasNonLatestImageTag = (reference: string): boolean => {
  const lastSlash = reference.lastIndexOf("/");
  const tagSeparator = reference.lastIndexOf(":");
  return tagSeparator > lastSlash && reference.slice(tagSeparator + 1) !== "latest";
};
const unknownKeys = (value: unknown, allowed: readonly string[], label: string): void => {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) errors.push(`${label} has unknown property ${key}`);
};
const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));
const dependencyFields = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

async function packageManifests(root: string): Promise<readonly JsonRecord[]> {
  const result: JsonRecord[] = [];
  const visit = async (directory: string): Promise<void> => {
    let entries: readonly { name: string; isDirectory(): boolean; isFile(): boolean }[] = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.name === "package.json" && entry.isFile()) {
        const value = await readJson(path);
        if (isRecord(value)) result.push(value);
      } else if (
        entry.isDirectory() &&
        !["node_modules", "dist", "build", ".next", ".turbo"].includes(entry.name)
      ) {
        await visit(path);
      }
    }
  };
  await Promise.all([visit(join(root, "packages")), visit(join(root, "apps"))]);
  return result;
}

function catalogFromWorkspace(value: string): Readonly<Record<string, string>> {
  const catalog: Record<string, string> = {};
  let inCatalog = false;
  for (const line of value.split(/\r?\n/u)) {
    if (/^catalog:\s*$/u.test(line)) {
      inCatalog = true;
      continue;
    }
    if (inCatalog && /^\S/u.test(line)) {
      inCatalog = false;
    }
    if (inCatalog) {
      const match = /^\s{2,}['"]?([^'":]+)['"]?:\s*([^\s#]+)\s*$/u.exec(line);
      if (match?.[1] && match[2]) catalog[match[1]] = match[2];
    }
  }
  return catalog;
}

const errors: string[] = [];
const root = resolve(process.argv[2] ?? process.cwd());
const release = await readJson(resolve(root, "release-manifest.json"));
if (!isRecord(release)) errors.push("release-manifest.json must be an object");
if (isRecord(release)) {
  for (const key of [
    "$schema",
    "schemaVersion",
    "release",
    "status",
    "releasedAt",
    "runtime",
    "approvedMajors",
    "testedPackages",
    "containerImages",
    "enabledProfiles",
    "compatibilityEvidence",
    "qualifications",
    "evidence",
    "securityWaivers",
  ]) {
    if (!(key in release)) errors.push(`starter-release.json is missing ${key}`);
  }
  if (release.$schema !== "./tooling/release/release-manifest.schema.json")
    errors.push("release-manifest.json must reference the bundled schema");
  unknownKeys(
    release,
    [
      "$schema",
      "schemaVersion",
      "release",
      "status",
      "releasedAt",
      "runtime",
      "approvedMajors",
      "testedPackages",
      "containerImages",
      "enabledProfiles",
      "compatibilityEvidence",
      "qualifications",
      "evidence",
      "securityWaivers",
    ],
    "starter-release.json",
  );
  if (release.schemaVersion !== 2) errors.push("schemaVersion must be 2");
  if (typeof release.release !== "string" || release.release.length === 0)
    errors.push("release must be a non-empty string");
  if (
    release.status !== "prerelease" &&
    release.status !== "released" &&
    release.status !== "superseded"
  )
    errors.push("release status is invalid");
  unknownKeys(release.runtime, ["node", "pnpm"], "runtime");
  if (
    !isRecord(release.runtime) ||
    typeof release.runtime.node !== "string" ||
    !/^\d+\.\d+\.\d+$/u.test(release.runtime.node) ||
    typeof release.runtime.pnpm !== "string" ||
    !/^\d+\.\d+\.\d+$/u.test(release.runtime.pnpm)
  )
    errors.push("runtime versions must be exact semantic versions");
  if (!isStringRecord(release.testedPackages))
    errors.push("testedPackages must contain exact package versions");
  if (
    !isRecord(release.approvedMajors) ||
    Object.values(release.approvedMajors).some(
      (value) => !Number.isInteger(value) || Number(value) < 0,
    )
  )
    errors.push("approvedMajors must contain non-negative integers");
  if (!Array.isArray(release.containerImages)) {
    if (!isRecord(release.containerImages)) errors.push("containerImages must be an object");
  } else errors.push("containerImages must be an object");
  if (isRecord(release.containerImages))
    for (const [name, image] of Object.entries(release.containerImages)) {
      unknownKeys(image, ["reference", "digest"], `container image ${name}`);
      if (
        !isRecord(image) ||
        typeof image.reference !== "string" ||
        image.reference.length === 0 ||
        typeof image.digest !== "string" ||
        !/^sha256:[a-f0-9]{64}$/u.test(image.digest)
      )
        errors.push(`container image ${name} must contain a non-empty reference and sha256 digest`);
      else if (!hasNonLatestImageTag(image.reference))
        errors.push(`container image ${name} must use a non-latest tag`);
    }
  if (
    !Array.isArray(release.enabledProfiles) ||
    !release.enabledProfiles.every((value) => typeof value === "string" && value.length > 0) ||
    new Set(release.enabledProfiles).size !== release.enabledProfiles.length
  )
    errors.push("enabledProfiles must be a unique non-empty string array");
  if (
    !Array.isArray(release.compatibilityEvidence) ||
    !release.compatibilityEvidence.every(
      (item) =>
        isRecord(item) &&
        typeof item.gate === "string" &&
        item.gate.length > 0 &&
        ["passed", "failed", "pending", "blocked_external", "waived"].includes(
          String(item.status),
        ) &&
        typeof item.evidence === "string" &&
        item.evidence.length > 0,
    )
  )
    errors.push("compatibilityEvidence is invalid");
  if (Array.isArray(release.compatibilityEvidence))
    for (const [index, item] of release.compatibilityEvidence.entries())
      unknownKeys(item, ["gate", "status", "evidence"], `compatibilityEvidence[${index}]`);
  if (release.releasedAt !== null && !isDateTime(release.releasedAt))
    errors.push("releasedAt must be null or a valid UTC date-time");
  if (
    release.status === "released" &&
    (typeof release.releasedAt !== "string" || !isDateTime(release.releasedAt))
  )
    errors.push("releasedAt is required when status is released");
  if (release.status === "prerelease" && release.releasedAt !== null)
    errors.push("releasedAt must remain null while status is prerelease");
  if (!Array.isArray(release.qualifications)) errors.push("qualifications must be an array");
  if (!Array.isArray(release.evidence)) errors.push("evidence must be an array");
  if (Array.isArray(release.evidence))
    for (const [index, item] of release.evidence.entries()) {
      unknownKeys(
        item,
        [
          "schemaVersion",
          "subject",
          "generatorVersion",
          "recipeHash",
          "sourceCommit",
          "environment",
          "provider",
          "deploymentTarget",
          "topology",
          "artifactDigests",
          "migrationDigests",
          "gate",
          "evidenceType",
          "status",
          "evidenceUri",
          "verifier",
          "observedAt",
          "expiresAt",
        ],
        `evidence[${index}]`,
      );
      const subject = isRecord(item) && isRecord(item.subject) ? item.subject : {};
      const artifacts =
        isRecord(item) && isRecord(item.artifactDigests) ? item.artifactDigests : {};
      const valid =
        isRecord(item) &&
        item.schemaVersion === 1 &&
        isRecord(item.subject) &&
        [
          "release",
          "profile",
          "provider",
          "deployment_target",
          "topology",
          "repository",
          "application",
          "artifact",
        ].includes(String(subject.kind)) &&
        typeof subject.id === "string" &&
        typeof subject.version === "string" &&
        typeof item.generatorVersion === "string" &&
        /^sha256:[a-f0-9]{64}$/u.test(String(item.recipeHash ?? "")) &&
        /^[a-f0-9]{40}$/u.test(String(item.sourceCommit ?? "")) &&
        ["ci", "staging", "production", "recovery"].includes(String(item.environment)) &&
        (item.provider === null || typeof item.provider === "string") &&
        (item.deploymentTarget === null ||
          ["dokploy", "railway"].includes(String(item.deploymentTarget))) &&
        (item.topology === null || typeof item.topology === "string") &&
        Object.values(artifacts).every((digest) => /^sha256:[a-f0-9]{64}$/u.test(String(digest))) &&
        Array.isArray(item.migrationDigests) &&
        item.migrationDigests.every((digest) => /^sha256:[a-f0-9]{64}$/u.test(String(digest))) &&
        typeof item.gate === "string" &&
        (item.evidenceType === undefined ||
          [
            "security",
            "browser",
            "accessibility",
            "coverage",
            "telemetry",
            "image_scan",
            "sbom",
            "recovery",
            "deployment",
            "approval",
            "migration",
            "monitoring",
          ].includes(String(item.evidenceType))) &&
        ["passed", "failed", "pending", "blocked_external", "waived"].includes(
          String(item.status),
        ) &&
        typeof item.evidenceUri === "string" &&
        typeof item.verifier === "string" &&
        isDateTime(item.observedAt) &&
        (item.expiresAt === null || isDateTime(item.expiresAt));
      if (!valid) errors.push(`evidence[${index}] is invalid`);
    }
  if (!Array.isArray(release.securityWaivers)) errors.push("securityWaivers must be an array");
  if (Array.isArray(release.securityWaivers))
    for (const [index, waiver] of release.securityWaivers.entries()) {
      unknownKeys(
        waiver,
        [
          "id",
          "scanner",
          "findingId",
          "advisoryIds",
          "severity",
          "affectedPath",
          "affectedArtifact",
          "evidenceDigest",
          "affectedSubject",
          "dependencyPath",
          "reachability",
          "mitigation",
          "controls",
          "owner",
          "reviewedAt",
          "expiresAt",
          "removalCondition",
          "blocksProduction",
        ],
        `securityWaivers[${index}]`,
      );
      if (
        !isRecord(waiver) ||
        typeof waiver.id !== "string" ||
        typeof waiver.scanner !== "string" ||
        typeof waiver.findingId !== "string" ||
        !Array.isArray(waiver.advisoryIds) ||
        waiver.advisoryIds.length === 0 ||
        !waiver.advisoryIds.every((item) => typeof item === "string" && item.length > 0) ||
        !["low", "medium", "high", "critical"].includes(String(waiver.severity)) ||
        typeof waiver.affectedPath !== "string" ||
        typeof waiver.affectedArtifact !== "string" ||
        !/^sha256:[a-f0-9]{64}$/u.test(String(waiver.evidenceDigest ?? "")) ||
        !Array.isArray(waiver.dependencyPath) ||
        waiver.dependencyPath.length === 0 ||
        typeof waiver.mitigation !== "string" ||
        !Array.isArray(waiver.controls) ||
        waiver.controls.length === 0 ||
        !isDateTime(waiver.reviewedAt) ||
        !isDateTime(waiver.expiresAt) ||
        waiver.blocksProduction !== true
      )
        errors.push(`securityWaivers[${index}] is invalid`);
    }
  if (
    release.status === "released" &&
    Array.isArray(release.qualifications) &&
    release.qualifications.some(
      (item) =>
        isRecord(item) && item.sourceMaturity === "stable" && item.qualification !== "qualified",
    )
  )
    errors.push("every stable subject must be qualified before release promotion");
  if (
    release.status === "released" &&
    Array.isArray(release.compatibilityEvidence) &&
    release.compatibilityEvidence.some(
      (item) =>
        !isRecord(item) ||
        (item.status !== "passed" &&
          !String(item.gate).startsWith("experimental-") &&
          !String(item.gate).startsWith("beta-")),
    )
  )
    errors.push("every stable compatibility gate must pass before release promotion");
}
const packageJson = await readJson(resolve(root, "package.json"));
const runtime = isRecord(release) && isRecord(release.runtime) ? release.runtime : {};
if (isRecord(packageJson) && packageJson.packageManager !== `pnpm@${String(runtime.pnpm ?? "")}`)
  errors.push("packageManager must match release runtime.pnpm");
if (isRecord(packageJson) && isRecord(packageJson.engines) && typeof runtime.node === "string") {
  const [major, minor] = runtime.node.split(".");
  if (packageJson.engines.node !== `${major}.${minor}.x`)
    errors.push("package.json engines.node must match the released Node line");
}
const tested = isRecord(release) && isRecord(release.testedPackages) ? release.testedPackages : {};
const approved =
  isRecord(release) && isRecord(release.approvedMajors) ? release.approvedMajors : {};
for (const [name, value] of Object.entries(tested)) {
  if (typeof value !== "string") continue;
  const major = Number.parseInt(value.split(".")[0] ?? "", 10);
  if (approved[name] !== major) errors.push(`approvedMajors must contain ${name}: ${major}`);
}
for (const name of Object.keys(approved))
  if (!(name in tested)) errors.push(`approved major ${name} has no exact tested package version`);
const manifests = [
  ...(isRecord(packageJson) ? [packageJson] : []),
  ...(await packageManifests(root)),
];
const localWorkspaceNames = new Set(
  manifests
    .filter((manifest) => typeof manifest.name === "string")
    .map((manifest) => String(manifest.name)),
);
for (const manifest of manifests) {
  const dependencies = Object.fromEntries(
    dependencyFields.flatMap((field) =>
      Object.entries(isRecord(manifest[field]) ? manifest[field] : {}),
    ),
  ) as Record<string, unknown>;
  for (const [name, value] of Object.entries(dependencies)) {
    if (
      typeof value !== "string" ||
      localWorkspaceNames.has(name) ||
      value.startsWith("workspace:") ||
      value.startsWith("file:") ||
      value.startsWith("link:") ||
      name.startsWith("node:") ||
      builtinModules.includes(name)
    )
      continue;
    if (tested[name] !== value)
      errors.push(
        `workspace dependency ${String(manifest.name)} ${name}@${value} is missing from testedPackages`,
      );
  }
}
const workspace = await readFile(resolve(root, "pnpm-workspace.yaml"), "utf8");
for (const [name, version] of Object.entries(catalogFromWorkspace(workspace))) {
  if (tested[name] !== version)
    errors.push(`catalog package ${name}@${version} does not match testedPackages`);
}
if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
} else process.stdout.write("product release manifest is consistent\n");
