# Synthetic Dokploy staging

This overlay is for `FLEET-STAGING-001` only. It uses `APP_ENV=ci` and private
Mailpit so that identity flows can be exercised without a paid mail provider.
It is not a production or customer-data configuration.

The public application is the web service at `staging-fleet.thaarei.com`.
Point its server-only `API_INTERNAL_URL` at the private API service. Keep the
API, worker, PostgreSQL, Valkey, and Mailpit services on the isolated Dokploy
network with no published ports or domains.

Required synthetic-only values:

- `APP_ENV=ci`
- `IDENTITY_MAIL_PROVIDER=mailpit`
- `IDENTITY_MAILPIT_URL=http://fleet-staging-mailpit:8025`
- `BETTER_AUTH_URL=https://staging-fleet.thaarei.com`
- `ALLOWED_ORIGINS=https://staging-fleet.thaarei.com`

Use separate API, worker, and migrator PostgreSQL roles. Do not set
`MIGRATOR_DATABASE_URL` or `ADMIN_DATABASE_URL` on a long-running service.
Replace this overlay with the true staging contract and ZeptoMail before any
real data admission.
