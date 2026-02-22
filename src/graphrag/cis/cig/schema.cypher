// Constraints
CREATE CONSTRAINT cig_persona_id IF NOT EXISTS FOR (p:CIGPersona) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT cig_account_id IF NOT EXISTS FOR (a:CIGAccount) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT cig_artifact_id IF NOT EXISTS FOR (art:CIGArtifact) REQUIRE art.id IS UNIQUE;
CREATE CONSTRAINT cig_channel_id IF NOT EXISTS FOR (c:CIGChannel) REQUIRE c.id IS UNIQUE;

// Indexes
CREATE INDEX cig_tenant_id IF NOT EXISTS FOR (n:CIGPersona) ON (n.tenant_id);
CREATE INDEX cig_valid_from IF NOT EXISTS FOR (n:CIGPersona) ON (n.valid_from);
