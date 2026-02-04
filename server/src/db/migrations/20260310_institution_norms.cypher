// 20260310_institution_norms.cypher
// Schema migration for Institution, Infrastructure, and Norms layer

// Institution
CREATE CONSTRAINT institution_id_unique IF NOT EXISTS FOR (n:Institution) REQUIRE n.id IS UNIQUE;
CREATE INDEX institution_name_index IF NOT EXISTS FOR (n:Institution) ON (n.name);
CREATE INDEX institution_category_index IF NOT EXISTS FOR (n:Institution) ON (n.category);
CREATE INDEX institution_tenant_index IF NOT EXISTS FOR (n:Institution) ON (n.tenantId);

// Infrastructure
CREATE CONSTRAINT infrastructure_id_unique IF NOT EXISTS FOR (n:Infrastructure) REQUIRE n.id IS UNIQUE;
CREATE INDEX infrastructure_name_index IF NOT EXISTS FOR (n:Infrastructure) ON (n.name);
CREATE INDEX infrastructure_type_index IF NOT EXISTS FOR (n:Infrastructure) ON (n.type);
CREATE INDEX infrastructure_tenant_index IF NOT EXISTS FOR (n:Infrastructure) ON (n.tenantId);

// Norm
CREATE CONSTRAINT norm_id_unique IF NOT EXISTS FOR (n:Norm) REQUIRE n.id IS UNIQUE;
CREATE INDEX norm_name_index IF NOT EXISTS FOR (n:Norm) ON (n.name);
CREATE INDEX norm_legitimacy_index IF NOT EXISTS FOR (n:Norm) ON (n.legitimacyScore);
CREATE INDEX norm_tenant_index IF NOT EXISTS FOR (n:Norm) ON (n.tenantId);

// Ensure relationship types exist (Neo4j creates them dynamically, but good to document)
// :TARGETS, :ERODES, :REINFORCES, :SUPPORTS
