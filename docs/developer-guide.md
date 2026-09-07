# Thaarei Fleet developer guide

This private repository is independently owned. Resolved profiles: `web`, `api`, `data`, `identity`, `tenancy`, `jobs`, `events`, `cache`, `rate-limit`.

## Prerequisites

Use Node 24.20.0, pnpm 11.22.0, and Docker. Copy .env.example to .env and never commit secrets.

## Quick start

    pnpm install --frozen-lockfile
    pnpm db:up
    pnpm db:migrate
    pnpm dev

## Commands and configuration

See environment-reference.md for the selected variables. pnpm dev starts selected applications. The web uses port 3000. The API uses port 3001. pnpm check runs formatting, governance, typecheck, build, and tests.
pnpm dev:api starts API watch mode. pnpm dev:web starts the Next.js app (native `next dev -p 3000` binds loopback; the platform VM instead runs `next dev -H 0.0.0.0` via the DevX compose override). pnpm dev:worker starts the worker on port 3002.  pnpm db:down stops local containers.

## Runtimes: native local vs platform VM vs Dokploy

Native local (`compose.yaml`) targets `127.0.0.1` (PostgreSQL, Valkey, Mailpit, `API_INTERNAL_URL=http://127.0.0.1:3001`). The platform VM runs the same stack inside the VM over service hostnames (`postgres`, `valkey`, `mailpit`, `api:3001`) and forwards only `127.0.0.1:${FRONTEND_PORT}` and `127.0.0.1:${API_PORT}` to this machine; the MacBook holds a synced copy of the codebase for editing, ChatGPT, and browser use while the servers run in the VM. Browser access works via `127.0.0.1:${FRONTEND_PORT}` and the `fleet-frontend-<instance>.localhost:${FRONTEND_PORT}` hostname (allowed in `allowedDevOrigins`, trusted in `ALLOWED_ORIGINS`/`BETTER_AUTH_URL`). Staging/production deploy to Dokploy in a Linux VM with managed PostgreSQL/Valkey, per-role database URLs (`API_DATABASE_URL`, `WORKER_DATABASE_URL`, deploy-time `MIGRATOR_DATABASE_URL`), and `IDENTITY_MAIL_PROVIDER=zeptomail`; see `deployment/dokploy/services.json`.

## Architecture and data flow

Domain rules belong in packages/core, persistence belongs in packages/database when selected, and provider implementations belong in packages/adapters. The API validates transport data and composes selected persistence and provider dependencies. Browser code uses the typed tRPC client. Server-only Next.js routes proxy selected API paths through API_INTERNAL_URL and preserve cookies. The worker process executes selected durable background jobs.

## Package ownership and maturity

| Module | Maturity | Ownership |
| --- | --- | --- |
| @thaarei-technology/foundation | exact private dependency | shared primitives |
| core | ready baseline | domain rules and ports |
| contracts | ready baseline | Zod-backed wire contracts |
| database | ready baseline | schema, repositories, migrations |
| api | ready baseline | Fastify, tRPC, health, authentication transport |
| api-client | ready baseline | typed tRPC application client |
| identity | ready baseline | authentication adapter and application identity mapping |
| test-support | ready baseline | shared test helpers |
| design-tokens | ready baseline | shared presentation tokens |
| adapters | scaffold | replaceable provider integrations |
| web | scaffold | browser application shell |
| worker | scaffold | Graphile Worker process |
| tenancy | ready baseline | organization authorization, RLS context, invitations, grants, and audit contracts |
| events | ready baseline | versioned outbox, inbox, lease, fencing, retry, and replay contracts |
| cache | contract-validated | tenant namespacing, TTL, invalidation, and Valkey boundary |
| rate-limit | contract-validated | risk-tiered distributed fail-closed policy |
| product integrations | deferred integration | organization, RBAC, AI, jobs, storage, and deployment operations unless selected and implemented |

ready baseline is runnable and typed. scaffold provides an extension seam. Deferred product integrations remain unclaimed.

## Extension recipes

Add domain rules in packages/core. Add typed procedures in packages/api. Add persistence changes as numbered migrations. Run pnpm db:migrate, and never edit an applied migration. Add providers in packages/adapters behind an existing core port. Extend the reference flow only after you understand the typed client and same-origin proxy. Add background work through the jobs port and worker composition.

## Validation and troubleshooting

Run pnpm check before handoff. If variables are missing, check the root .env. Verify the API health endpoint and confirm that port 3001 is available. If the web app does not start, confirm that port 3000 is available and rerun pnpm dev:web. If proxied browser requests fail, check server-only API_INTERNAL_URL. Verify signup, signin, the session cookie, viewer mapping, and persisted identity rows. Check worker logs and WORKER_CONCURRENCY for background job failures. If readiness is degraded, run pnpm db:up and pnpm db:migrate. If a checksum is rejected, restore the applied file and create a new migration.

## Deferred gates

This handoff does not claim live deployment, backup restore, rollback, paid-provider delivery, or native-device proof. The generic starter contracts do not constitute an Thaarei Fleet product implementation.
