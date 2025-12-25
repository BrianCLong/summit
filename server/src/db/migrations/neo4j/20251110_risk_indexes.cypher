// Add indexes for Risk entities to support fast lookups
CREATE INDEX risk_score_id IF NOT EXISTS FOR (r:RiskScore) ON (r.id);
CREATE INDEX risk_score_tenant IF NOT EXISTS FOR (r:RiskScore) ON (r.tenantId);
CREATE INDEX risk_score_entity IF NOT EXISTS FOR (r:RiskScore) ON (r.entityId);
CREATE INDEX risk_score_level IF NOT EXISTS FOR (r:RiskScore) ON (r.level);
CREATE INDEX risk_score_created IF NOT EXISTS FOR (r:RiskScore) ON (r.createdAt);

// Ensure RiskSignal lookup performance
CREATE INDEX risk_signal_id IF NOT EXISTS FOR (s:RiskSignal) ON (s.id);
CREATE INDEX risk_signal_type IF NOT EXISTS FOR (s:RiskSignal) ON (s.type);

// Constraints (optional, depending on strictness requirements)
// CREATE CONSTRAINT risk_score_id_unique IF NOT EXISTS FOR (r:RiskScore) REQUIRE r.id IS UNIQUE;
