---
workId: FLEET-P1
title: Generate Fleet and establish the application runtime
origin: docs/IMPLEMENTATION_PLAN.md#P1
status: complete
owner: Nishanth
createdAt: 2026-09-07
updatedAt: 2026-09-07
sourceOfTruthIds: []
affectedPaths:
  - apps
  - packages
  - docker
  - .github
  - .thaarei
  - release-manifest.json
  - pnpm-lock.yaml
  - vitest.config.ts
---

# Generate Fleet and establish the application runtime

## Objective

Import the verified Thaarei Fleet generated product and prove the P1 application
foundation: identity and tenant context, forced-RLS persistence, repeatable
migrations, real worker dispatch, fail-closed Valkey coordination, immutable
local images, and the bounded DevX runtime.

## Scope

- Dependency: accepted P0 recipe and private-package access.
- Recorded starter source: `/Users/nishanth/projects/app-starter-kit` commit
  `d34272063cc3bd8fb86ac2be6e68e3418b744989`, tag
  `starter-v1.0.0-dev.1`, plus the separate reviewed P1 repair diff with SHA-256
  `f5e0b137777fd07d4895acab0bbbdfaf38e6144e0df4c4c677cdce029538cbc7`.
- Generated/imported the 123-file Fleet source tree and changed the P1 runtime
  paths listed in frontmatter. The main product edits are in `apps/api`,
  `apps/web`, `apps/worker`, `packages/api`, `packages/api-client`,
  `packages/adapters`, `packages/core`, `packages/database`,
  `docker/postgres/init.sql`, the three application Dockerfiles, CI workflows,
  `pnpm-lock.yaml`, `release-manifest.json`, and `vitest.config.ts`.
- External profile changes are in
  `/Users/nishanth/.codex/devx/profiles/fleet/` and are intentionally outside
  the application repository.
- Separate starter repairs are limited to `packages/create-app/src/index.ts`,
  `index.test.ts`, `generator.ts`, and `initializer.test.ts` on branch
  `codex/fleet-p1-install-auth`; they were not copied into Fleet as ad hoc
  product patches.

## Non-goals

- No P2 or later product work.
- No GitHub repository creation, commit, push, release, package publication,
  Dokploy deployment, production mutation, or ULIP action.
- No claim of pilot readiness from these P1 foundation results.
- Mailpit is synthetic local evidence only. Live ZeptoMail delivery, external
  CI execution, production secrets, restore, rollback, and deployment gates
  remain owner-controlled later evidence.

## Acceptance criteria

- [x] Generation and product checks pass using the recorded source and versions.
- [x] Starter auth installation and generated CI/image authentication defects
  have starter-side regression coverage and regenerated-output comparison.
- [x] Browser signup, verification, login, password recovery, session
  revocation, and switching between two synthetic organizations pass.
- [x] Dedicated runtime roles are non-superuser/NOBYPASSRLS, tenant tables are
  owned by the NOLOGIN owner role with forced RLS, and cross-tenant reads and
  runtime DDL are denied.
- [x] Product migrations are repeatable and a real Graphile Worker job dispatches
  the typed outbox event and records its outcome.
- [x] Valkey loss makes readiness fail and denies a dependent auth mutation
  without changing PostgreSQL-backed identity, session, or organization state;
  recovery succeeds after Valkey restarts.
- [x] The Fleet profile declares all seven services, health checks, DevX labels,
  resource limits, two loopback-only forwards, and reports zero sync conflicts.
- [x] API, web, and worker production images build locally as UID/GID 1000 from
  digest-pinned bases with private registry credentials supplied only as a
  required BuildKit secret.

## Validation

- Starter `devx test test-skip-git`: passed, 58 tests.
- Starter `devx test qualify-selected-profiles`: passed for the exact nine Fleet
  profiles, `dokploy`/`standard`, with no generated Git metadata.
- Starter `devx test pack-check`: passed all three isolated package consumers.
- Starter `devx test validate-starter`: release, publication, governance,
  formatting, lint, typecheck, 130 tests, pack-check, and generated web-only,
  internal-tool, web-developer-handoff, web-mobile-product, and
  durable-agentic-workflow fixtures passed. The broader all-server-capabilities
  fixture could not invoke Docker from the hardened starter container; see
  Blockers.
- Fleet `devx profile validate fleet`, `devx setup`, and explicit `devx start`:
  passed after correcting the instance-origin contract.
- Fleet `devx test format`, `format-check`, and `lint`: passed. Lint retains five
  generated Turborepo environment warnings and nine non-failing style infos.
- Fleet `devx test typecheck`: passed 11/11 packages.
- Fleet `devx test build`: passed 11/11 packages; Next routes include `/`,
  `/api/auth/[...path]`, and `/trpc/[...path]`.
- Fleet `devx test check-migrations`: passed.
- Fleet `devx test migrate`: first clean run applied migrations `0000` and
  `0001` plus Graphile Worker; repeat runs were no-ops. Digests:
  `sha256:40ca9e94a2787880078848e6d1af47feca5d7cae067329396c1429742b2c4d8f`
  and `sha256:d3c5dc75493b98f8359d01e4a27caf52633450a30645273b725e25a5219e3e16`.
- Fleet `devx test identity-tests`: passed 4 files, 14 tests.
- Fleet `devx test foundation-tests`: passed 4 files, 8 tests.
- Fleet `devx test data-tests`: passed the live role, ownership, forced-RLS,
  cross-tenant, and SQLSTATE `42501` DDL-denial proof.
- Fleet `devx test worker-proof`: passed a real job/outbox flow; event
  `0a008d1e-5b80-4e9e-9a8a-fd332201e40f` was delivered once with fencing token
  `1`, and both workflows completed.
- Fleet `devx test check`: passed release, project, source-of-truth, boundary,
  implementation, migration, typecheck, build, and all 27 tests after adding
  the GLIDE client to release metadata.
- Local image builds through `devx exec -- docker build ... --secret id=npmrc`:
  passed for API, web, and worker. Image IDs are
  `sha256:9f8acd5b40b3c3598b962a03bbd12d8fc50f57eb65d0d344dca4d700d40dc219`,
  `sha256:618f51ae135cd50ebbd1274a3e3e68235180166229be783de94f7c3d54e2ca75`,
  and `sha256:9d8987f883082d34cca9f189fd41f5e8798be2854544e3a9a52cfaec5066ade9`.
  Exact-token history checks and runtime npmrc checks passed for all three.
- The generated `pnpm security:secrets` wrapper could not start nested Docker
  inside the hardened tooling container. Running its exact digest-pinned
  Gitleaks scanner at the DevX host boundary against a temporary source-only
  tree scanned 1.01 MB and found no leaks. An initial unfiltered scan found only
  ignored Next.js build/runtime tokens under `.next`; no such finding exists in
  the repository source set.

## Evidence

- Generated recipe hash:
  `sha256:0836e9d08b90712697156c1642974a03caba5a11c666128c1522249f6c79ae0b`.
- Generated source-tree hash:
  `sha256:76a3eef9ce1972e1a00e4c6aca753937c1dc0fe1213b1ea47b02b1613f8d57af`.
  Identity is `thaarei-fleet` / `Thaarei Fleet`, package scope is `@thaarei`,
  owners are `Nishanth`, deployment is `dokploy`/`standard`, and resolved
  profiles are `web,api,data,identity,tenancy,jobs,events,cache,rate-limit`.
- The repaired final regeneration produced the same CI workflows and three
  Dockerfiles imported into Fleet; no `.git` directory was emitted.
- Browser user `p1-browser-20260907-02@example.test` received Mailpit verification
  and recovery mail, authenticated after both verification and password reset,
  selected synthetic organization IDs ending in `0001` and `0002`, revoked its
  active session, and then received `UNAUTHORIZED` until re-authentication.
- Live RLS proof: `starter_api`, `starter_migrator`, and `starter_worker` are
  LOGIN, non-superuser, NOBYPASSRLS roles; `starter_owner` is NOLOGIN,
  non-superuser, NOBYPASSRLS. API read only tenant A and worker read only tenant
  B; each runtime role was denied schema creation with SQLSTATE `42501`.
- Live Valkey outage: `/health/ready` returned 503 and auth sign-in returned 429.
  Before and during the outage PostgreSQL stayed at one application user, one
  session, two organizations, and two memberships. Sign-in passed after Valkey
  restart. Valkey command configuration disables RDB and AOF persistence.
- Final `devx status --json`: web, API, worker, tooling, PostgreSQL, Valkey, and
  Mailpit are healthy; resource admission passes; only `127.0.0.1:47121` and
  `127.0.0.1:47152` are forwarded; synchronization conflicts are empty.

## Decisions

- Better Auth and CORS use the exact DevX instance frontend origin so browser
  callbacks remain same-origin through bounded Next.js proxies.
- PostgreSQL is durable truth. Valkey holds only fail-closed, short-lived,
  atomically updated coordination counters and is configured without
  persistence.
- The API and worker use separate NOBYPASSRLS roles; only the migrator can apply
  schema changes, and application tables are owned by a separate NOLOGIN role.
- Unknown outbox types fail visibly. Delivery is recorded only after the typed
  handler succeeds.
- ZeptoMail is behind the product adapter seam, while P1 local validation uses
  Mailpit and no provider credential.
- Private registry credentials are temporary mode-0600 npm configuration for
  development and a required BuildKit secret for image builds and CI.

## Blockers

No P1 acceptance blocker remains.

Non-blocking environment limitation: the starter's broader
all-server-capabilities generated fixture attempted `pnpm db:up` inside the
hardened starter container, where the Docker CLI is intentionally absent. The
exact selected Fleet profile qualification, regenerated Fleet product checks,
live PostgreSQL/Valkey/worker runtime, and all Fleet gates passed. A future
starter validation improvement should provide an authorized external Docker
runner or classify this fixture as unavailable in hardened-container mode.

Implemented pending live evidence: GitHub-hosted CI, ZeptoMail delivery,
registry publication, Dokploy deployment, backup/restore, rollback, and
production secrets were not exercised because P1 did not authorize pushes,
publication, deployment, or production actions.

## Handoff

P2 may start from this P1 foundation and must implement only the Fleet,
location, and vehicle-registry vertical slice defined in the plan. Reuse the
typed API/client boundary, organization request context, tenant transaction
helpers, forced-RLS ownership model, and dedicated runtime roles. Create a new
P2 work record and synthetic P2 fixtures; do not reuse the browser-test password
or treat the disposable DevX rows as product seed data. Preserve the provider,
outbox, and Valkey fail-closed boundaries. Git commit/push, live CI, registry,
deployment, and provider actions remain explicit owner decisions.

## Completion

P1 implementation and its authorized local acceptance evidence are complete as
of 2026-09-07. This establishes the application foundation only and does not
establish pilot readiness.
