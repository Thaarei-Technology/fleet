# Environment reference

Copy .env.example to .env for local work. Production receives values from its deployment platform. Never commit secrets.

Runtime truth: `apps/api/src/index.ts` (`API_DATABASE_URL`, `IDENTITY_ZEPTOMAIL_*`), `apps/worker/src/index.ts` (`WORKER_DATABASE_URL`), `packages/database/src/migrate.ts` (`MIGRATOR_DATABASE_URL`, local-only `DATABASE_URL` fallback). `deployment/dokploy/services.json` mirrors those schemas for staging/production.

Local has two shapes. Native local runs `compose.yaml` on this machine and uses `127.0.0.1` hostnames. The platform VM (DevX `fleet` profile) runs the same containers inside the VM and uses service hostnames (`postgres`, `valkey`, `mailpit`, `api`); only `FRONTEND_PORT`/`API_PORT` are forwarded to `127.0.0.1` on this machine. Staging/production run on Dokploy in a Linux VM with managed PostgreSQL/Valkey and ZeptoMail.

| Variable | Safe local example | Production requirement |
| --- | --- | --- |
| APP_ENV | local | Admission environment: local, ci, staging, or production. |
| NODE_ENV | development | Set by local development; production platform supplies it. |
| PORT | 3001 | API port; the selected web app uses 3000. |
| ALLOWED_ORIGINS | http://127.0.0.1:3000 | Public frontend origin(s), comma-separated. Must include the browser-visible origin (DevX uses both `http://127.0.0.1:${FRONTEND_PORT}` and `http://fleet-frontend-<instance>.localhost:${FRONTEND_PORT}`). |
| TRUSTED_PROXY_CIDRS |  | CIDRs of trusted Dokploy/Traefik proxies, comma-separated. |
| REQUEST_BODY_LIMIT_BYTES | 1048576 | Request body cap (1024-10485760). |
| RESPONSE_BODY_LIMIT_BYTES | 2097152 | Response body cap (1024-10485760). |
| REQUEST_TIMEOUT_MS | 15000 | Request timeout (1000-120000). |
| API_DATABASE_URL | postgres://starter_api:starter_api_local@127.0.0.1:5432/starter | Non-owner `starter_api` runtime role; NOBYPASSRLS, USAGE-only, never migrates or owns schemas. Platform VM uses `postgres://starter_api:starter_api_local@postgres:5432/starter`. Dokploy uses the managed-PostgreSQL api-role URL. |
| WORKER_DATABASE_URL | postgres://starter_worker:starter_worker_local@127.0.0.1:5432/starter | Non-owner `starter_worker` runtime role; same constraints as the api role. Platform VM uses `@postgres:5432`. Dokploy uses the managed-PostgreSQL worker-role URL. |
| MIGRATOR_DATABASE_URL | postgres://starter_migrator:starter_migrator_local@127.0.0.1:5432/starter | Dedicated migrator role; used only by `pnpm db:migrate` / deploy-time migration. Never expose to application processes. Required outside local development. |
| DATABASE_URL |  | Local-only `db:migrate` fallback when `MIGRATOR_DATABASE_URL` is unset. Do not set in staging or production. |
| ADMIN_DATABASE_URL | postgres://starter_admin:starter_admin_local@127.0.0.1:5432/starter | Tooling and data-proof tests only (DevX tooling service uses `@postgres:5432`). Never app runtime. |
| BETTER_AUTH_SECRET | replace-with-a-local-secret | Generated high-entropy secret, minimum 32 non-placeholder characters outside local/CI. |
| BETTER_AUTH_URL | http://127.0.0.1:3000 | Browser-visible origin serving the authentication path. DevX uses `http://fleet-frontend-<instance>.localhost:${FRONTEND_PORT}`. Dokploy uses the public web domain. |
| IDENTITY_MAIL_PROVIDER | mailpit | `mailpit` in local/CI only; `zeptomail` in staging/production (enforced at boot). |
| IDENTITY_FROM_EMAIL | identity@example.test | Verified sender in production. |
| IDENTITY_ZEPTOMAIL_API_KEY |  | Required secret when the provider is `zeptomail`. Empty in local. |
| IDENTITY_ZEPTOMAIL_URL | https://api.zeptomail.in/v1.1/email | Optional provider-endpoint override. |
| IDENTITY_MAILPIT_URL | http://127.0.0.1:8025 | Local and CI only. Platform VM uses `http://mailpit:8025`. Omit in staging/production. |
| API_INTERNAL_URL | http://127.0.0.1:3001 | Server-only Next.js proxy target; never public browser configuration. Platform VM uses `http://api:3001`. Dokploy uses the internal api address. |
| NEXT_PUBLIC_API_BASE_URL | http://127.0.0.1:47121 | Set by the DevX platform VM. Currently unused by web code (server proxies use `API_INTERNAL_URL`); reserved for future browser-direct calls. |
| WORKER_PORT | 3002 | Worker health port; separate from the API port. Binds `0.0.0.0` in the platform VM. |
| WORKER_CONCURRENCY | 2 | Graphile Worker concurrency (1-50). |
| VALKEY_URL | redis://127.0.0.1:6379 | Fail-closed coordination cache without persistence; never authoritative state. Platform VM uses `redis://valkey:6379`. Dokploy uses managed Valkey. |
| THAAREI_FLEET_FIXTURE_ID | local | Observability instance id reported in health payloads. DevX sets it to the instance id. |
| FRONTEND_PORT | 47121 | DevX host-only loopback forward for the platform-VM web service (`127.0.0.1:${FRONTEND_PORT}` -> VM `3000`). Not application env. |
| API_PORT | 47152 | DevX host-only loopback forward for the platform-VM api service (`127.0.0.1:${API_PORT}` -> VM `3001`). Not application env. |
