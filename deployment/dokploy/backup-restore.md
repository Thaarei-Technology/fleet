# Database backup and restore

Configure encrypted S3 backups for the Dokploy-managed PostgreSQL database. On a disposable environment, create a marker record, run a backup, restore it into a separate database, verify the marker and application readiness, and record timestamps and object identifiers in the active work item.
