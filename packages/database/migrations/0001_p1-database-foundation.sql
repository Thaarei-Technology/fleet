-- P1 database foundation: separate runtime identities from schema ownership,
-- and make the generated tenant controls survive a migration boundary.

DO $$
DECLARE
  role_name text;
  role_record record;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['starter_owner', 'starter_migrator', 'starter_api', 'starter_worker'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      RAISE EXCEPTION 'Required database role is missing: %', role_name;
    END IF;
  END LOOP;

  SELECT rolsuper, rolbypassrls, rolcanlogin INTO role_record
  FROM pg_roles WHERE rolname = 'starter_api';
  IF role_record.rolsuper OR role_record.rolbypassrls OR NOT role_record.rolcanlogin THEN
    RAISE EXCEPTION 'starter_api must be a login role without superuser or bypass-RLS privileges';
  END IF;

  SELECT rolsuper, rolbypassrls, rolcanlogin INTO role_record
  FROM pg_roles WHERE rolname = 'starter_worker';
  IF role_record.rolsuper OR role_record.rolbypassrls OR NOT role_record.rolcanlogin THEN
    RAISE EXCEPTION 'starter_worker must be a login role without superuser or bypass-RLS privileges';
  END IF;

  SELECT rolcanlogin INTO role_record FROM pg_roles WHERE rolname = 'starter_owner';
  IF role_record.rolcanlogin THEN
    RAISE EXCEPTION 'starter_owner must be a NOLOGIN role';
  END IF;
  IF NOT has_schema_privilege('starter_owner', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'starter_owner requires CREATE on public for safe ownership transfer';
  END IF;
  IF NOT has_database_privilege('starter_migrator', current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'starter_migrator requires database CREATE for managed worker schema migrations';
  END IF;
END
$$;

-- Every current tenant-bearing table is explicitly fail-closed.  The runner
-- also transfers newly-created tenant tables after each future migration.
-- The organization root is itself tenant data but intentionally has no
-- organization_id column, so transfer it explicitly before assuming the
-- inactive owner role. This also repairs databases where 0000 was applied by
-- the migrator before this P1 ownership rule existed.
DO $$
BEGIN
  IF (
    SELECT pg_get_userbyid(relowner) = current_user
    FROM pg_class
    WHERE oid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations OWNER TO starter_owner;
  END IF;
END
$$;

ALTER FUNCTION app_current_organization_id() OWNER TO starter_owner;
ALTER FUNCTION app_current_subject_id() OWNER TO starter_owner;
ALTER FUNCTION protect_last_organization_owner() OWNER TO starter_owner;

SET ROLE starter_owner;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organizations',
    'memberships',
    'governance_role_assignments',
    'product_role_assignments',
    'permission_grants',
    'invitations',
    'authorization_audit_events',
    'outbox_events',
    'outbox_dead_letters',
    'inbox_receipts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$$;

-- Organization selection is the one controlled cross-tenant metadata query:
-- a subject may discover only organizations where that subject has an active
-- membership. Writes still require the explicit organization context.
DROP POLICY IF EXISTS organizations_tenant_isolation ON organizations;
CREATE POLICY organizations_tenant_isolation ON organizations
  USING (
    id = app_current_organization_id()
    OR EXISTS (
      SELECT 1
      FROM memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.user_id = app_current_subject_id()
        AND memberships.status = 'active'
    )
  )
  WITH CHECK (id = app_current_organization_id());

DROP POLICY IF EXISTS memberships_tenant_isolation ON memberships;
CREATE POLICY memberships_tenant_isolation ON memberships
  USING (
    organization_id = app_current_organization_id()
    OR user_id = app_current_subject_id()
  )
  WITH CHECK (organization_id = app_current_organization_id());

-- Runtime roles receive only the application data-plane grants.  Worker-only
-- Graphile grants are applied by the migration runner after Graphile setup.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organizations',
    'memberships',
    'governance_role_assignments',
    'product_role_assignments',
    'permission_grants',
    'invitations',
    'authorization_audit_events',
    'outbox_events',
    'outbox_dead_letters',
    'inbox_receipts'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO starter_api, starter_worker', table_name);
  END LOOP;
END
$$;
GRANT EXECUTE ON FUNCTION app_current_organization_id() TO starter_api, starter_worker;
GRANT EXECUTE ON FUNCTION app_current_subject_id() TO starter_api, starter_worker;

-- Transfer only after the migrator has applied the grants above. The inactive
-- owner role remains the sole owner of tenant tables and their RLS policies.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organizations',
    'memberships',
    'governance_role_assignments',
    'product_role_assignments',
    'permission_grants',
    'invitations',
    'authorization_audit_events',
    'outbox_events',
    'outbox_dead_letters',
    'inbox_receipts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO starter_owner', table_name);
  END LOOP;
END
$$;

RESET ROLE;

-- Keep defaults owned by the actual migration role; the owner role is never a
-- login and must not become the creator of future migration objects.
ALTER DEFAULT PRIVILEGES FOR ROLE starter_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO starter_api, starter_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE starter_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO starter_api, starter_worker;
