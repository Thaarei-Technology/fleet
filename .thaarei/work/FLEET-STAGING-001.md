---
workId: FLEET-STAGING-001
title: Qualify Fleet P1 on Dokploy synthetic staging
origin: docs/IMPLEMENTATION_PLAN.md#fleet-staging-001
status: in_progress
owner: Nishanth
createdAt: 2026-09-07
updatedAt: 2026-09-07
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
- [ ] Four immutable artifacts are scanned, attested, and recorded by digest.
- [ ] Dokploy 0.30.5 passes the disposable adapter contract suite.
- [ ] New project is isolated; only web is public at the selected hostname.
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
- Fleet main workflow built and pushed all four immutable images and produced
  registry attestations and SBOM artifacts, but the Trivy HIGH/CRITICAL gate
  remains failing; no digest is accepted for deployment yet.
- Starter generator regression fix adds role bootstrap before the all-server
  fixture migration run; local typecheck and initializer tests pass.
- Never record secret values or full connection strings.

## Decisions

- Cloudflare is accepted for synthetic staging even though traffic may leave
  India. India-hosted recovery remains a later gate.
- Mailpit is used only with `APP_ENV=ci`; true staging still requires ZeptoMail.
- The existing R2 destination is used only under a Fleet-specific prefix.

## Blockers

- The GHCR package token was exposed in a remote process listing during a
  diagnostic scan. The GitHub repository secrets were removed immediately;
  the token must be revoked and replaced before any further CI or Dokploy
  activity. Do not reuse the exposed credential.
- After replacement, protected CI must pass the Trivy HIGH/CRITICAL gate and
  publish accepted four-artifact digests, SBOMs, and attestations.
- Dokploy API access must be restored with the replacement operator credential
  before remote qualification can continue.
- Browser automation is not currently attached; interactive user-facing proof
  remains open until the ChatGPT browser is available.

## Handoff

P2 may start only after this record is complete and the generated dashboard is
resynchronized. The handoff must list open ZeptoMail, India recovery, provider,
privacy, and production gates explicitly.

## Completion

Pending.
