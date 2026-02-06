// ATG Schema Constraints
CREATE CONSTRAINT atg_identity_tenant_id_id IF NOT EXISTS FOR (n:ATGIdentity) REQUIRE (n.tenant_id, n.id) IS UNIQUE;
CREATE CONSTRAINT atg_asset_tenant_id_id IF NOT EXISTS FOR (n:ATGAsset) REQUIRE (n.tenant_id, n.id) IS UNIQUE;
CREATE CONSTRAINT atg_slice_tenant_id_time IF NOT EXISTS FOR (n:ATGSlice) REQUIRE (n.tenant_id, n.slice_time) IS UNIQUE;

// Indexes for performance
CREATE INDEX atg_identity_tenant IF NOT EXISTS FOR (n:ATGIdentity) ON (n.tenant_id);
CREATE INDEX atg_asset_tenant IF NOT EXISTS FOR (n:ATGAsset) ON (n.tenant_id);
CREATE INDEX atg_slice_tenant IF NOT EXISTS FOR (n:ATGSlice) ON (n.tenant_id);
