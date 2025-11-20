-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create policy to allow application to read all tenants (since it needs to load them)
-- But we want to ensure that if we were using a user-scoped connection, they could only see their own.
-- For now, the application connects as a service user, so it needs full access.
-- However, this migration demonstrates the mechanism.

-- In a real scenario where we have per-tenant users in the database, we would do:
-- CREATE POLICY tenant_isolation_policy ON tenants
-- USING (id = current_setting('app.current_tenant')::uuid);

-- For this task, we will provide a function to set the current tenant,
-- and example policies for other tables.

-- Function to set the current tenant in the session
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id, false);
END;
$$ LANGUAGE plpgsql;

-- Function to get current tenant, helpful for default values or checks
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS text AS $$
BEGIN
  RETURN current_setting('app.current_tenant', true);
END;
$$ LANGUAGE plpgsql;

-- Example: Create a policy for any future table that has a tenant_id column
-- CREATE POLICY tenant_isolation_policy ON some_table
-- USING (tenant_id = get_current_tenant()::uuid);
