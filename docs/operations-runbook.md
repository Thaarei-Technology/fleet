# Operations runbook

## Deploy and promote

Build each image once, retain its immutable digest, verify its attestation and scan results, run reviewed migrations with the migrator role, deploy to staging, and promote that same digest only after readiness and smoke checks. Never rebuild between staging and production and never run an automatic down migration.

## Roll back

Select a recorded previous digest compatible with the current schema, reverify its attestation, redeploy, verify readiness, and drain the failed candidate. Escalate when compatibility evidence is missing.

## Recover data

Run `pnpm recovery:verify` locally or in the protected deep workflow for data projects. Production restores use encrypted external backups, a new restore target, marker/application verification, and sanitized evidence. A successful backup job alone is not recovery evidence.

## Rotate secrets

Create the replacement in the deployment environment, update affected services without logging the value, deploy and verify, revoke the previous credential, and record only identifiers and timestamps. An optional operator may use `infisical run -- <command>`; applications do not depend on an Infisical SDK.

## Incident response

Contain affected credentials and traffic, preserve logs and release evidence, notify Nishanth and Nishanth, restore a verified state, and record follow-up work. Never paste sensitive evidence into public issues.
