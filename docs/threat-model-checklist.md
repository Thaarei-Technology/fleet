# Threat-model checklist

- Identify assets, actors, trust boundaries, selected providers, and exposed entrypoints.
- Review authentication assurance, authorization, tenancy isolation, enumeration, and session revocation.
- Review input limits, origin/CSRF policy, outbound destinations, retries, idempotency, and webhook verification.
- Review secrets, logs, telemetry, backups, generated artifacts, dependency scripts, and image contents.
- Review migration roles, RLS runtime-role evidence, deployment digest equality, rollback compatibility, and restore evidence.
- Record mitigations, owners, expiry dates, and any production-blocking exception in the work ledger.

This checklist supports review; it is not a certification claim.
