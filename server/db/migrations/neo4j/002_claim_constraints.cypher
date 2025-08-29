// Neo4j Constraints for IntelGraph GA-Core
// Committee Requirements: Claim, Evidence, License nodes with constraints

// Create Claim node constraints (Committee requirement)
CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT claim_hash IF NOT EXISTS FOR (c:Claim) REQUIRE c.content_hash IS UNIQUE;

// Create Evidence node constraints (Committee requirement) 
CREATE CONSTRAINT evidence_hash IF NOT EXISTS FOR (e:Evidence) REQUIRE e.sha256 IS UNIQUE;
CREATE CONSTRAINT evidence_id IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE;

// Create License node constraints (Foster's dissent requirement)
CREATE CONSTRAINT license_id IF NOT EXISTS FOR (l:License) REQUIRE l.id IS UNIQUE;
CREATE CONSTRAINT license_type IF NOT EXISTS FOR (l:License) REQUIRE l.type IS NOT NULL;

// Create Authority node constraints (Starkey's dissent requirement)
CREATE CONSTRAINT authority_id IF NOT EXISTS FOR (a:Authority) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT authority_binding IF NOT EXISTS FOR (a:Authority) REQUIRE a.binding_type IS NOT NULL;

// Create User node constraints for authorization
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;

// Create Investigation node constraints
CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE;

// Create Entity node constraints for graph integrity
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Create indexes for performance
CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type);
CREATE INDEX claim_timestamp_idx IF NOT EXISTS FOR (c:Claim) ON (c.created_at);
CREATE INDEX evidence_timestamp_idx IF NOT EXISTS FOR (e:Evidence) ON (e.created_at);
CREATE INDEX license_status_idx IF NOT EXISTS FOR (l:License) ON (l.status);
CREATE INDEX authority_level_idx IF NOT EXISTS FOR (a:Authority) ON (a.clearance_level);

// Committee requirement: Provenance chain integrity
CREATE INDEX provenance_chain_idx IF NOT EXISTS FOR (p:Provenance) ON (p.parent_hash);
CREATE CONSTRAINT provenance_hash IF NOT EXISTS FOR (p:Provenance) REQUIRE p.hash IS UNIQUE;

// XAI explainability constraints
CREATE INDEX xai_model_idx IF NOT EXISTS FOR (x:XAIExplanation) ON (x.model_version);
CREATE INDEX xai_confidence_idx IF NOT EXISTS FOR (x:XAIExplanation) ON (x.confidence);
