---
workId: FLEET-STAGING-001
title: Qualify Fleet P1 on Dokploy synthetic staging
origin: docs/IMPLEMENTATION_PLAN.md#fleet-staging-001
status: in_progress
owner: Nishanth
createdAt: 2026-09-07
updatedAt: 2026-09-08
sourceOfTruthIds: []
affectedPaths:
  - .github/workflows/supply-chain.yml
  - deployment/dokploy
  - docs
  - .thaarei
  - docker
  - packages/database
---

# Qualify Fleet P1 on Dokploy synthetic staging

## Objective

Deploy the completed P1 foundation to a new isolated Dokploy project on the
E2E Platform VM and qualify its synthetic staging operation before P2.

## Scope

- Dokploy project `Thaarei Fleet`, environment `staging`.
- Public web at `staging-fleet.thaarei.com`; API, worker, PostgreSQL, Valkey,
  and Mailpit remain private.
- Synthetic `APP_ENV=ci` and Mailpit evidence only.
- Immutable GHCR images, Dokploy 0.30.5 contract, DNS/TLS, migration, worker,
  identity, tenant/RLS, Valkey, rollback, R2 backup, and disposable restore.
- Reusable generator and deployment fixes remain owned by app-starter-kit.

## Non-goals

- No P2 vehicle, fleet, location, driver, ULIP, or customer-data work.
- No ZeptoMail qualification, production promotion, or pilot-readiness claim.
- No modification of existing Fleet Compliance projects, services, domains, or
  volumes.
- No secrets in source, Git, logs, synchronization, or work evidence.

## Acceptance criteria

- [ ] Starter release-pipeline and deployment defects have regression tests and
  reviewed regenerated Fleet output.
- [x] Four immutable artifacts are scanned, attested, and recorded by digest.
- [ ] Dokploy 0.30.5 passes the disposable adapter contract suite.
- [x] New project is isolated; only web is public at the selected hostname.
- [ ] DNS, direct-origin TLS, Cloudflare proxy, and public-port checks pass.
- [ ] Database roles, repeatable migrations, worker dispatch, identity flows,
  tenant isolation, and Valkey fail-closed behavior pass.
- [ ] Candidate A/B deployment, rollback to A, and forward deployment pass.
- [ ] Synthetic R2 backup and separate-database restore pass.
- [ ] Resource, coexistence, and on-demand stop evidence is recorded.

## Plan

1. Preserve the starter checkout's existing uncommitted P1 repair and implement
   the reusable fixes in its owning generator modules.
2. Regenerate or import the reviewed changes into Fleet and update release and
   Dokploy contracts.
3. Run Fleet and starter validation, merge the release fix, and record image
   digests, attestations, SBOMs, and migration checksums.
4. Create the isolated Dokploy project and configure its secret-safe runtime.
5. Qualify Dokploy 0.30.5, configure DNS/TLS, deploy by immutable digest, and
   run the synthetic application, failure, rollback, and restore suites.
6. Stop the on-demand stack, retain definitions and recoverable volumes, and
   hand off the evidence before P2.

## Validation

- `devx status --json`: Fleet DevX runtime healthy with web, API, worker,
  PostgreSQL, Valkey, Mailpit, and tooling; no sync conflicts.
- `devx test foundation-tests`: passed role, RLS, and cross-tenant proof.
- `devx test identity-tests`: passed 14 tests.
- `devx test worker-proof`: passed real worker and outbox delivery proof.
- `devx test typecheck`: passed all 11 packages.
- `devx test build`: passed all 11 package builds.
- `devx test test`: passed 27 tests.
- `devx test check`: passed formatting, governance, migration, typecheck,
  build, and test gates; Biome reports existing informational lint warnings.
- Starter `devx test test-skip-git`: passed 58 generator tests.
- Starter `devx test pack-check`: passed clean-consumer tarball validation.
- Starter `devx test validate-starter`: generated fixtures passed until the
  all-server recovery case, which is blocked because Docker is unavailable
  inside the DevX container.

## Evidence

- Isolated Dokploy project `Thaarei Fleet` and `staging` environment created;
  managed PostgreSQL and Valkey resources plus six application shells are
  provisioned without changing existing Fleet Compliance resources.
- `staging-fleet.thaarei.com` resolves DNS-only to `151.185.47.72`.
- Fleet main workflow run `34150171179` passed all four build jobs, exact-image
  Trivy scans, runtime hardening checks, registry attestations, and SBOM
  generation for source commit `a3564282442b5c1143fedb09f2bdfa3ba7f5df7f`.
  Accepted image digests are recorded below; release-evidence artifacts are
  retained in GitHub Actions.
- Release-evidence artifact IDs: web `10029162513`, API `10029160127`,
  worker `10029150044`, migration `10029128396`; SPDX SBOM artifact IDs: web
  `10029143714`, API `10029141120`, worker `10029131522`, migration
  `10029113740`.
- Accepted image digests:
  - web `ghcr.io/thaarei-technology/fleet-web@sha256:e175dcab52233f07ef8b3ef74c8343949708f43de58d45dbc8d0d8296a1038f7`
  - API `ghcr.io/thaarei-technology/fleet-api@sha256:b732233ee15ba7a960dd3429301b970b0304d648ddfe2e482aa9de1036b1844f`
  - worker `ghcr.io/thaarei-technology/fleet-worker@sha256:096dc5b83c7f76ba6f0cc25134fdc6657a5d0e200c52d31522df7415064ebde9`
  - migration `ghcr.io/thaarei-technology/fleet-migration@sha256:9c9afd64628d11e46a40c0c4510945ab51109434e72ea4cc6f531e6e4eb9feeb`
- Migration source checksums at the accepted commit: `0000_starter.sql`
  `sha256:40ca9e94a2787880078848e6d1af47feca5d7cae067329396c1429742b2c4d8f`
  and `0001_p1-database-foundation.sql`
  `sha256:d3c5dc75493b98f8359d01e4a27caf52633450a30645273b725e25a5219e3e16`.
- Dokploy API qualification evidence: v0.30.5 and OpenAPI 3.1 verified;
  application inspection, empty `deployment.all` (HTTP 204), and failure
  reporting passed. The isolated registry was updated with the refreshed
  credential and corrected `thaarei-technology` mirror prefix.
- Disposable private-image deploys now authenticate successfully through the
  refreshed VM-side registry credential: Dokploy's registry test passes and
  the Swarm mirror reaches `Registry Login Success`. The exact-digest deploy
  still fails in Dokploy 0.30.5 after the pull, because its mirror attempts
  `docker tag <image>@<digest> <image>@<digest>` and Docker rejects a digest
  reference as a tag. The failed test record is retained by Dokploy; the
  migration definition was restored and the application was stopped back to
  idle.
- The direct Docker-provider path (with each app's registry association
  removed) successfully pulled and deployed the migration, API, worker, and
  web release digests. The migration table contains both expected checksums;
  a repeat migration deployment completed without adding a migration. API and
  worker readiness returned 200, and the web origin returned 200. Dokploy CPU
  ceilings were corrected to raw nano-CPU strings (`500000000`, `1000000000`,
  and `250000000`) after its initial `1e-09` validation error.
- The first web artifact exposed a deployment defect: its build-time Next
  rewrite had baked `http://127.0.0.1:3001` into the route manifest, so
  `/trpc` and `/api/auth` returned 500 even though the runtime
  `API_INTERNAL_URL` was correct. Fleet now relies on its existing runtime
  App Router proxy handlers; a new four-image release is required before
  user-facing identity qualification.
- DNS-only web domain remains `staging-fleet.thaarei.com` -> `151.185.47.72`;
  HTTPS and Cloudflare proxy are intentionally not enabled before the private
  image gate passes.
- Starter generator regression fix adds role bootstrap before the all-server
  fixture migration run; local typecheck and initializer tests pass.
- Never record secret values or full connection strings.

## Decisions

- Cloudflare is accepted for synthetic staging even though traffic may leave
  India. India-hosted recovery remains a later gate.
- Mailpit is used only with `APP_ENV=ci`; true staging still requires ZeptoMail.
- The existing R2 destination is used only under a Fleet-specific prefix.

## Blockers

- The previously exposed GHCR credential was revoked and replaced. Runtime
  database, Valkey, and Better Auth secrets were also rotated without recording
  values.
- Dokploy 0.30.5 requires a writable cloud registry for its Swarm image mirror;
  the refreshed VM-side credential now passes that registry login, but exact
  digest deployment remains blocked by Dokploy's digest-reference tagging bug.
  Keep qualification `unqualified` until a supported 0.30.5 path completes the
  immutable deploy and rollback tests. Direct provider deployment avoids the
  mirror for normal pulls, but registry-backed rollback still fails because
  the credential cannot push rollback copies.
- Local DevX dependency installation is blocked by the separate private npm
  package credential returning HTTP 401; protected CI is passing.
- Browser automation is not currently attached; interactive user-facing proof
  remains open until the ChatGPT browser is available.

## Handoff

P2 may start only after this record is complete and the generated dashboard is
resynchronized. The handoff must list open ZeptoMail, India recovery, provider,
privacy, and production gates explicitly.

## Completion

Pending.
