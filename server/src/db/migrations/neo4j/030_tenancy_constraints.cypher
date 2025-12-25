CREATE INDEX entity_tenant_id IF NOT EXISTS FOR (n:Entity) ON (n.tenantId);
