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
- [x] Dokploy 0.30.5 passes the disposable adapter contract suite.
- [x] New project is isolated; only web is public at the selected hostname.
- [x] DNS, direct-origin TLS, Cloudflare proxy, and public-port checks pass.
- [x] Database roles, repeatable migrations, worker dispatch, identity flows,
  tenant isolation, and Valkey fail-closed behavior pass.
- [x] Candidate A/B deployment, rollback to A, and forward deployment pass.
- [x] Synthetic R2 backup and separate-database restore pass.
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

- Closeout plan: complete a Dokploy UI restore into a pre-created disposable
  database, validate the restored schema and migrations, remove the disposable
  database, enable Docker-backed starter qualification through the trusted
  bootstrap DevX profile, rerun the full starter matrix, and recheck both the
  DevX and public browser paths.

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
- `pnpm implementation:sync`, `pnpm check:source-of-truth`,
  `pnpm check:boundaries`, `pnpm check:implementation`, and
  `pnpm release:check`: passed locally (Node 26.4.0 emits the repository's
  existing Node 24.20.x engine warning).
- Final DevX `pnpm check`: passed formatting, lint without errors, release and
  project checks, source-of-truth, boundaries, implementation synchronization,
  migration integrity, 11 package typechecks, 11 package builds, the Next.js
  production build, and 27 tests. Biome reported existing advisory-level style
  notices only.
- Fleet `devx test install`: passed the frozen-lockfile installation across all
  12 workspace projects with pnpm 11.22.0; the prior private-registry HTTP 401
  no longer reproduces.
- Proxied HTTPS checks: `/`, `/trpc/health`, and
  `/api/auth/get-session` returned 200; HTTP returned 301 to HTTPS; Cloudflare
  headers and direct-origin certificate validation passed.
- Dokploy registry refresh and candidate A/B deployment, rollback, and
  reapply checks passed with the recorded immutable image IDs and rollback
  identifiers above.

## Evidence

- Isolated Dokploy project `Thaarei Fleet` and `staging` environment created;
  managed PostgreSQL and Valkey resources plus six application shells are
  provisioned without changing existing Fleet Compliance resources.
- `staging-fleet.thaarei.com` was initially verified DNS-only against
  `151.185.47.72`; the final check below records the subsequent Cloudflare
  proxy switch and direct-origin validation.
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
- Corrected Fleet main workflow run `34154217805` passed all four build jobs,
  exact-image Trivy scans, runtime hardening, SBOM generation, and attestations
  for merged source commit `79ab5fc202b741e8b6afe06b3c8f3cc18f32a765`.
  Corrected immutable digests are:
  - web `ghcr.io/thaarei-technology/fleet-web@sha256:96072fb60fb1976903345e95c54728a072b3b2f918c8d19bf0af6378344c9ffb`
  - API `ghcr.io/thaarei-technology/fleet-api@sha256:d2563523ba3066ff9809b6a8b03fed621f8f02acbca7ca1c0d724ac205deec82`
  - worker `ghcr.io/thaarei-technology/fleet-worker@sha256:1b373b732d4817656b026f1f9da75a42f156f15be29ed396a8cb347ea10f3c27`
  - migration `ghcr.io/thaarei-technology/fleet-migration@sha256:ff6ab31f831969feb03347e35389cd1278165300119676921ed2f6a2e1a8aad7`
- Corrected release-evidence artifact IDs are web `10030470581`, API
  `10030463730`, worker `10030461208`, and migration `10030454035`.
  SPDX SBOM artifact IDs are web `10030454301`, API `10030448080`, worker
  `10030445197`, and migration `10030439648`.
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
- The corrected web digest is active and the web runtime API target is
  `fleet-staging-api-4cpzuy` (the actual Dokploy service DNS name). Direct
  origin `/`, `/trpc/health`, and `/api/auth/get-session` return 200.
- DNS `staging-fleet.thaarei.com` resolves to `151.185.47.72`. Dokploy now
  serves a Let’s Encrypt certificate directly on that origin (CN/SAN matches
  the hostname, issuer Let’s Encrypt, validity observed through 2026-12-06),
  and HTTP redirects to HTTPS. The record is now Cloudflare-proxied: DNS
  returns Cloudflare anycast addresses, HTTPS responses include `server:
  cloudflare`, `cf-ray`, and dynamic cache status, and the proxied health
  response matches the direct-origin health contract.
- All six Fleet services have zero published Docker ports; only the web
  application has the Dokploy domain. API, worker, Mailpit, PostgreSQL, and
  Valkey remain private on the Dokploy network.
- Live HTTPS synthetic identity proof passed: signup, Mailpit verification,
  sign-in, session listing, individual session revocation, password recovery,
  reset-session revocation, old-password rejection, and new-password sign-in.
  Two seeded synthetic organizations were listed and switched; viewer access
  succeeded for each member organization and a non-member switch returned 403.
- Live worker proof passed with a disposable outbox event submitted twice:
  the event was delivered once (`attempt_count=1`, one delivery receipt) and
  both idempotent workflow records completed.
- Live P1 database proof passed: the four roles have the expected login,
  superuser, and bypass-RLS attributes; API and worker DDL probes were denied,
  the migrator DDL probe was allowed inside a rolled-back transaction, and
  RLS returned one row for the selected organization and zero rows for the
  other organization. The corrected migration ran and a repeat run remained
  checksum-stable.
- Valkey outage proof passed: API readiness degraded and the auth rate limiter
  failed closed with 429 while Valkey was stopped, then recovered after the
  service returned. API, worker, PostgreSQL, and Valkey restart recovery all
  returned to ready state.
- Security request probes passed: invalid origin 403, malformed JSON 400,
  oversized body 413, and forwarded-header probe did not bypass the route
  boundary. Web, API, worker, Mailpit, and the stopped migration service were
  additionally hardened in the
  live Swarm services with non-root images, read-only roots, `ALL` capability
  drop, `/tmp` tmpfs, and the configured memory/CPU ceilings. PostgreSQL and
  Valkey resource ceilings were then applied through their Dokploy deploy
  operations as 1 GiB/1 CPU and 256 MiB/0.25 CPU respectively. Dokploy 0.30.5
  does not expose these hardening fields in its application API, so this live
  control is not yet represented in the generated service definition.
- Post-deployment coexistence snapshot: the VM reported 14,880 MiB total and
  9,301 MiB available; Fleet service limits were web 512 MiB/0.5 CPU, API 768
  MiB/1 CPU, worker 512 MiB/0.5 CPU, PostgreSQL 1 GiB/1 CPU, Valkey 256 MiB/0.25
  CPU, and Mailpit 256 MiB/0.25 CPU. All services were 1/1 after the resource
  update and API, worker, and web routes remained ready.
- Synthetic PostgreSQL backup completed to the existing R2 destination:
  backup `2bwx29SVB3xWJJxm73EOm`, execution `H7YE8NVe7MVwHW9oZZrqo`, and
  Fleet-only object
  `fleet-staging-postgres-ctuuws/fleet-staging-qualification-001/2026-09-07T19-37-31-932Z.sql.gz`
  (16,156 bytes). Disposable restore evidence is still open.
- The refreshed VM-side GHCR credential is present with protected file mode
  `0600`; Dokploy’s current registry test succeeds, Docker login and manifest
  inspection succeed, and the credential was injected into the private Fleet
  application definitions without recording its value.
- Registry-backed immutable rollback now passes after refreshing the Dokploy
  application credentials. Candidate A is web digest
  `sha256:96072fb60fb1976903345e95c54728a072b3b2f918c8d19bf0af6378344c9ffb`
  (deployment `6WdyEY2k708ZPS-6V44Za`, rollback `XyvutoHZPrU-brlYTHcM7`);
  candidate B is web digest
  `sha256:becd4ba442c27ca85a75d338619f5552eff32b027f6dc21c0b59cbb770f1b1e0`
  (deployment `2DP0K0H9TQi1jzh70nkbs`, rollback `C0ZOqWAOrtXimgByQ4Uxa`).
  Dokploy rollback to candidate A returned HTTP 200 and the running image ID
  matched candidate A; candidate B was then reapplied and its image ID and
  source revision matched the requested digest.
- In-app browser validation on 2026-09-08 confirmed the Dokploy staging
  environment lists the six long-lived Fleet services as healthy, with the
  migration job idle and no service errors. Only `fleet-staging-web` has the
  `staging-fleet.thaarei.com` domain; API, worker, Mailpit, migration, Valkey,
  and PostgreSQL show no public domain or external port.
- The public staging page loaded over HTTPS. Its typed health action returned
  `status: ok`, and its unauthenticated viewer action returned the expected
  `401 UNAUTHORIZED` boundary. Opening the HTTP URL landed on the HTTPS URL.
- Cloudflare DNS records show `staging-fleet.thaarei.com` as an A record for
  `151.185.47.72` with proxy status `Proxied`. Cloudflare SSL/TLS reports
  encryption mode `Full` and an active managed wildcard edge certificate.
- Dokploy deployment history and logs visibly show successful candidate A,
  candidate B, and candidate B reapply deployments. The candidate B log shows
  GHCR `Login Succeeded`, `Registry Login Success`, and the full active web
  digest `sha256:becd4ba442c27ca85a75d338619f5552eff32b027f6dc21c0b59cbb770f1b1e0`.
- The initial in-app-browser pass confirmed that Cloudflare R2 contains the Fleet backup object
  `fleet-staging-postgres-ctuuws/fleet-staging-qualification-001/2026-09-07T19-37-31-932Z.sql.gz`
  at 16.16 KB. Dokploy's PostgreSQL Backups UI can select that object for
  restore, but the final Restore action was not submitted; no disposable
  database was created during that initial pass.
- Dokploy restored that exact R2 object into the pre-created disposable database
  `fleet_restore_validation_20260908_0548` and reported `Restore completed
  successfully`. The restored database contained 23 public tables, two current
  migration ledger entries, five Graphile Worker tables, 242 public or worker
  constraints, ten RLS-enabled public tables, two synthetic organizations, and
  seven synthetic application users. Both migration ledger checksums matched
  the current `0000_starter.sql` and `0001_p1-database-foundation.sql` files.
  The disposable database was then dropped with `FORCE`, and a catalog query
  confirmed `database_remaining=0`. The active `fleet` database and staging
  services remained running.
- The trusted `fleet-starter-bootstrap` DevX profile now includes a pinned
  Docker 29.7.2 CLI, Compose v2, the Platform VM Docker socket, host networking,
  host-equivalent source and temporary paths, and a bounded Docker preflight.
  The complete `devx test validate-starter` matrix passed, including the former
  `all-server-capabilities` Docker blocker, and post-run inspection found no
  leftover fixture containers, volumes, or temporary directories.
- The Fleet DevX runtime was rebuilt and restarted after starter qualification.
  All seven services are healthy, both loopback port forwards are connected,
  and Mutagen reports zero synchronization conflicts. The in-app browser opened
  `http://fleet-frontend-a8b5b194bbaa.localhost:47121`; its typed health action
  returned `status: ok` with instance `a8b5b194bbaa`, and its signed-out viewer
  action returned `UNAUTHORIZED`.
- Direct top-level in-app-browser navigation to both the public and DevX
  `/trpc/health` URLs returns `net::ERR_BLOCKED_BY_CLIENT`, while the same
  endpoint succeeds when called by the loaded application. This isolates the
  behavior to the browser client's raw API-navigation policy; it does not block
  interactive browser qualification or HTTP-level API qualification.
- After the restore drill and disposable database deletion, the public staging
  page loaded again over Cloudflare HTTPS and its typed health action returned
  `status: ok` at `2026-09-08T06:03:49.382Z`.
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
- Dokploy 0.30.5's exact-digest cloud-mirror path still has a
  digest-reference tagging defect, so the immutable deployment proof uses the
  supported direct-Docker provider path. Registry-backed rollback is now
  qualified independently after the refreshed credential was injected into the
  application definitions.
- Dokploy 0.30.5 still exposes no restore procedure in its OpenAPI document.
  The required UI workflow passed against a disposable database, so this is an
  automation limitation rather than an open restore qualification blocker.
- Dokploy 0.30.5's application API and Swarm update surface do not expose the
  `no-new-privileges` security option declared by the service contract. The
  live qualification therefore proves non-root, read-only-root, capability
  drop, tmpfs, and resource controls, but not that additional kernel flag.
- Local DevX dependency installation and protected CI both pass. No package
  credential value was read or recorded.
- In-app browser validation is now complete for the accessible user-facing
  checks above. Direct navigation to the JSON-only `/trpc/health` endpoint was
  blocked by the browser client, so the typed health control was used for the
  interactive health proof; the existing non-browser HTTP evidence remains in
  the validation section.

## Handoff

P2 may start only after this record is complete and the generated dashboard is
resynchronized. The handoff must list open ZeptoMail, India recovery, provider,
privacy, and production gates explicitly.

## Completion

Pending.
