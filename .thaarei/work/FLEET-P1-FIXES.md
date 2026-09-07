---
workId: FLEET-P1-FIXES
title: Fix P1 review gaps (deploy env contract, dev-origin allowlist, VM docs)
origin: review of uncommitted FLEET-P1 tree
status: complete
owner: Nishanth
createdAt: 2026-09-07
updatedAt: 2026-09-07
sourceOfTruthIds: []
affectedPaths:
  - deployment/dokploy/services.json
  - docs/environment-reference.md
  - docs/developer-guide.md
  - apps/web/next.config.ts
  - .thaarei/work/FLEET-P1-FIXES.md
---

# Fix P1 review gaps

## Objective

Fix the three gaps from the P1 review without changing runtime behavior:
1. Stale deploy env contract (`services.json`, `environment-reference.md` vs Zod schemas).
2. Dev-host allowlist gap (`allowedDevOrigins` vs DevX `fleet-frontend-*` hostname).
3. VM-model doc gaps (forwards, fixture id, tooling URLs, proxy target).

## Scope

- `deployment/dokploy/services.json`: align the api/worker variable lists and
  the database block with `apps/api/src/index.ts`, `apps/worker/src/index.ts`,
  and `packages/database/src/migrate.ts`.
- `docs/environment-reference.md`: one table matching the Zod schemas, with
  native-local (`127.0.0.1`) vs platform-VM (service hostnames) vs Dokploy
  staging/production (managed services, ZeptoMail) guidance.
- `apps/web/next.config.ts`: extend `allowedDevOrigins` for the DevX
  `fleet-frontend-<instance>.localhost` hostname.
- `docs/developer-guide.md`: native vs platform-VM binds/hostnames plus the
  Dokploy note.
- Owner, tests, callers, boundaries: API env owner is
  `apps/api/src/index.ts` `environmentSchema`; worker env owner is
  `apps/worker/src/index.ts`; migrator owner is
  `packages/database/src/migrate.ts`. None of these owners change. No test
  covers `allowedDevOrigins` (verified: no matches in `tooling/` or web
  tests). No new source-of-truth block (config/docs only), no new
  dependencies, no provider exception, no secrets in source.

## Non-goals

- No runtime behavior change (no Zod schema, adapter, migration, or
  Dockerfile edits).
- No P2 product work, no commit/push, no live CI, registry, deployment, or
  provider actions.
- No pilot-readiness claim.

## Acceptance criteria

- [x] `services.json` api variables match the API Zod schema
  (`API_DATABASE_URL`, `IDENTITY_ZEPTOMAIL_API_KEY/URL`; no `DATABASE_URL`,
  no `IDENTITY_RESEND_API_KEY`, no `IDENTITY_MAILPIT_URL`); worker variables
  match the worker schema (`WORKER_DATABASE_URL`; no `DATABASE_URL`, no
  `VALKEY_URL`); database block lists the three role-scoped variables.
- [x] `environment-reference.md` documents every runtime variable including
  `FRONTEND_PORT`/`API_PORT`, `THAAREI_FLEET_FIXTURE_ID`,
  `ADMIN_DATABASE_URL`, and `NEXT_PUBLIC_API_BASE_URL`.
- [x] `allowedDevOrigins` permits the DevX `fleet-frontend-*` hostname.
- [x] Governance plus typecheck, build, and tests pass via the platform VM.

## Plan

1. `services.json`: api `DATABASE_URL` -> `API_DATABASE_URL`,
   `IDENTITY_RESEND_API_KEY` -> `IDENTITY_ZEPTOMAIL_API_KEY` +
   `IDENTITY_ZEPTOMAIL_URL`, drop `IDENTITY_MAILPIT_URL` (local-only);
   worker `DATABASE_URL` -> `WORKER_DATABASE_URL`, drop `VALKEY_URL`
   (worker does not read it); database block lists the three role-scoped
   variables with migrator-never-exposed note.
2. `environment-reference.md`: rewrite as above.
3. `next.config.ts`: `allowedDevOrigins` gains `*.localhost`.
4. `developer-guide.md`: runtimes paragraph as above.
5. Validate via `devx test implementation-sync`, `devx test typecheck`,
   `devx test build`, `devx test check`.

## Validation

- `devx test implementation-sync`: passed (regenerated `IMPLEMENTATION.md`).
- `devx test format-check`: passed, 90 files, no fixes.
- `devx test lint`: passed with the P1-baseline 5 warnings + 9 infos only.
- `devx test typecheck`: passed 11/11 (web re-ran after the
  `allowedDevOrigins` edit).
- `devx test build`: passed 11/11, Next routes `/`, `/api/auth/[...path]`,
  `/trpc/[...path]`.
- `devx test test`: passed 11 files, 27 tests.
- `devx test check-migrations`: passed.
- Full `devx test check`: release manifest consistent, project metadata
  valid, source-of-truth and boundaries clean. `check:implementation`
  reported missing-section errors on this work item (fixed by adding Scope,
  Non-goals, Acceptance criteria, Completion) and an overlap between this
  item and `INIT-001`'s broad `apps/`/`deployment/` claims; marking this
  item complete resolves the overlap for this batch (see Blockers for the
  standing `INIT-001` claim).
- Native `pnpm` on the MacBook cannot run these checks (private GitHub
  registry auth lives only in the platform-VM tooling service); all results
  above are platform-VM evidence.
- Live runtime after fixes: `127.0.0.1:47152/health/ready` ok
  (`instanceId a8b5b194bbaa`), `127.0.0.1:47121/` 200.

## Evidence

- Platform VM live: `127.0.0.1:47152/health/ready` ok
  (`instanceId a8b5b194bbaa`), `127.0.0.1:47121/` 200 at review time.

## Decisions

- `DATABASE_URL` kept only as a local-only `db:migrate` fallback; never set
  in staging/production.
- `IDENTITY_MAILPIT_URL` kept only for local/CI; omitted from Dokploy contract.
- `NEXT_PUBLIC_API_BASE_URL` documented as DevX-set but currently unused
  (server proxies use server-only `API_INTERNAL_URL`).
- `FRONTEND_PORT`/`API_PORT` documented as DevX host-only loopback forwards,
  not application env.
- Profiles: `web`, `api`, `data`, `identity`, `jobs`, `cache`, `rate-limit`
  plus `dokploy-standard` adapter metadata (still `unqualified`).

## Blockers

No blocker in this batch. Commit/push remain explicit owner decisions (P1
tree is still untracked).

Standing process note for P2 kickoff: `INIT-001` is still `in_progress` with
broad `apps/`, `packages/`, `deployment/` claims, so any new active work item
touching those paths will trip `IMPLEMENTATION_OVERLAPPING_PATH`. Narrow or
complete `INIT-001` before starting P2.

## Handoff

After validation passes, mark this item complete, commit the P1 tree plus these fixes, then P2 may start.

## Completion

Complete as of 2026-09-07. All three P1 review gaps are fixed and validated
on the platform VM. No runtime behavior changed; no pilot readiness claimed.
