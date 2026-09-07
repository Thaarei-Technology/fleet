-- The application and worker must never connect as a table owner.  Keep the
-- owner role inactive and give the migrator membership only so it can assign
-- ownership during migrations without making that owner a login identity.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'starter_owner') THEN
    CREATE ROLE starter_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'starter_migrator') THEN
    CREATE ROLE starter_migrator LOGIN PASSWORD 'starter_migrator_local' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'starter_api') THEN
    CREATE ROLE starter_api LOGIN PASSWORD 'starter_api_local' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'starter_worker') THEN
    CREATE ROLE starter_worker LOGIN PASSWORD 'starter_worker_local' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE starter_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE starter_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE starter_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE starter_worker LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT starter_owner TO starter_migrator;

REVOKE ALL ON DATABASE starter FROM PUBLIC;
GRANT CREATE, CONNECT ON DATABASE starter TO starter_migrator;
GRANT CONNECT ON DATABASE starter TO starter_api, starter_worker;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
-- PostgreSQL requires a role to hold CREATE on the containing schema before
-- objects can be transferred to it. The owner remains NOLOGIN and can only be
-- assumed by the migrator; runtime roles retain USAGE only.
GRANT CREATE, USAGE ON SCHEMA public TO starter_migrator, starter_owner;
GRANT USAGE ON SCHEMA public TO starter_api, starter_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE starter_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO starter_api, starter_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE starter_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO starter_api, starter_worker;
