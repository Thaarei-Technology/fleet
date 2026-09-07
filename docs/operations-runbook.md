# Operations runbook

## Deploy and promote

Build each image once, retain its immutable digest, verify its attestation and scan results, run reviewed migrations with the migrator role, deploy to staging, and promote that same digest only after readiness and smoke checks. Never rebuild between staging and production and never run an automatic down migration.

## Fleet synthetic staging

`FLEET-STAGING-001` uses the isolated Dokploy project `Thaarei Fleet` and the
`staging-fleet.thaarei.com` web domain. The qualification environment sets
`APP_ENV=ci` and uses private Mailpit. It is synthetic evidence only and must
not receive customer or ULIP data.

Keep only the web application public. API, worker, PostgreSQL, Valkey, Mailpit,
and the one-shot migration job stay on the private project network. Deploy web,
API, and worker by their recorded GHCR digests. Run role bootstrap with the
administrator credential, then run migrations with the migrator credential.
Never put either credential in a long-running application environment.

The staging project is on-demand. After evidence capture, stop its services
without deleting its definitions or recoverable volumes. Start it again only
through the reviewed deployment procedure and recheck the active image digests.

The existing `thaarei-platform-backups` R2 destination may be used only with a
Fleet-specific prefix for synthetic backup and restore evidence. This does not
qualify the independent India-hosted recovery destination required for real
pilot data.

## Roll back

Select a recorded previous digest compatible with the current schema, reverify its attestation, redeploy, verify readiness, and drain the failed candidate. Escalate when compatibility evidence is missing.

## Recover data

Run `pnpm recovery:verify` locally or in the protected deep workflow for data projects. Production restores use encrypted external backups, a new restore target, marker/application verification, and sanitized evidence. A successful backup job alone is not recovery evidence.

## Rotate secrets

Create the replacement in the deployment environment, update affected services without logging the value, deploy and verify, revoke the previous credential, and record only identifiers and timestamps. An optional operator may use `infisical run -- <command>`; applications do not depend on an Infisical SDK.

## Incident response

Contain affected credentials and traffic, preserve logs and release evidence, notify Nishanth and Nishanth, restore a verified state, and record follow-up work. Never paste sensitive evidence into public issues.
