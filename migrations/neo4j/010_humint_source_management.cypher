/**
 * Neo4j Migration: HUMINT Source Management Schema
 *
 * This migration creates the graph schema for HUMINT source management,
 * including source nodes, relationships, indexes, and constraints.
 *
 * @migration 010_humint_source_management
 * @date 2025-11-29
 */

-- ============================================================================
-- HUMINT Source Node Constraints
-- ============================================================================

-- Unique constraint on source ID
CREATE CONSTRAINT humint_source_id_unique IF NOT EXISTS
FOR (s:HumintSource) REQUIRE s.id IS UNIQUE;

-- Unique constraint on cryptonym within tenant
CREATE CONSTRAINT humint_source_cryptonym_tenant IF NOT EXISTS
FOR (s:HumintSource) REQUIRE (s.cryptonym, s.tenantId) IS UNIQUE;

-- Handler unique constraint
CREATE CONSTRAINT humint_handler_id_unique IF NOT EXISTS
FOR (h:HumintHandler) REQUIRE h.id IS UNIQUE;

-- Debrief session unique constraint
CREATE CONSTRAINT humint_debrief_id_unique IF NOT EXISTS
FOR (d:HumintDebrief) REQUIRE d.id IS UNIQUE;

-- Intelligence item unique constraint
CREATE CONSTRAINT humint_intel_id_unique IF NOT EXISTS
FOR (i:HumintIntelligence) REQUIRE i.id IS UNIQUE;

-- Tasking unique constraint
CREATE CONSTRAINT humint_tasking_id_unique IF NOT EXISTS
FOR (t:HumintTasking) REQUIRE t.id IS UNIQUE;

-- ============================================================================
-- HUMINT Source Indexes for Performance
-- ============================================================================

-- Source type index for filtering
CREATE INDEX humint_source_type_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.sourceType);

-- Source status index for active/inactive queries
CREATE INDEX humint_source_status_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.status);

-- Credibility score index for quality filtering
CREATE INDEX humint_source_credibility_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.credibilityScore);

-- Handler assignment index
CREATE INDEX humint_source_handler_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.handlerId);

-- Tenant isolation index
CREATE INDEX humint_source_tenant_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.tenantId);

-- Last contact date index for dormancy tracking
CREATE INDEX humint_source_last_contact_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.lastContactDate);

-- Risk level index for security monitoring
CREATE INDEX humint_source_risk_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.riskLevel);

-- Classification level index for access control
CREATE INDEX humint_source_classification_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.classification);

-- Area of operation fulltext index
CREATE FULLTEXT INDEX humint_source_area_ft IF NOT EXISTS
FOR (s:HumintSource) ON EACH [s.areaOfOperation];

-- ============================================================================
-- Debrief Session Indexes
-- ============================================================================

-- Debrief source reference index
CREATE INDEX humint_debrief_source_idx IF NOT EXISTS
FOR (d:HumintDebrief) ON (d.sourceId);

-- Debrief handler index
CREATE INDEX humint_debrief_handler_idx IF NOT EXISTS
FOR (d:HumintDebrief) ON (d.handlerId);

-- Debrief status index for workflow queries
CREATE INDEX humint_debrief_status_idx IF NOT EXISTS
FOR (d:HumintDebrief) ON (d.status);

-- Debrief scheduled date index for calendar views
CREATE INDEX humint_debrief_scheduled_idx IF NOT EXISTS
FOR (d:HumintDebrief) ON (d.scheduledAt);

-- Debrief type index
CREATE INDEX humint_debrief_type_idx IF NOT EXISTS
FOR (d:HumintDebrief) ON (d.debriefType);

-- ============================================================================
-- Intelligence Item Indexes
-- ============================================================================

-- Intelligence topic fulltext index
CREATE FULLTEXT INDEX humint_intel_topic_ft IF NOT EXISTS
FOR (i:HumintIntelligence) ON EACH [i.topic, i.content];

-- Intelligence rating index
CREATE INDEX humint_intel_rating_idx IF NOT EXISTS
FOR (i:HumintIntelligence) ON (i.informationRating);

-- Intelligence actionability index
CREATE INDEX humint_intel_actionability_idx IF NOT EXISTS
FOR (i:HumintIntelligence) ON (i.actionability);

-- Intelligence perishability index for time-sensitive intel
CREATE INDEX humint_intel_perishability_idx IF NOT EXISTS
FOR (i:HumintIntelligence) ON (i.perishability);

-- ============================================================================
-- HUMINT Relationship Types
-- ============================================================================

-- Source reports on entity
CREATE INDEX humint_rel_reports_on IF NOT EXISTS
FOR ()-[r:REPORTS_ON]-() ON (r.confidence, r.validFrom);

-- Source has access to entity
CREATE INDEX humint_rel_has_access IF NOT EXISTS
FOR ()-[r:HAS_ACCESS_TO]-() ON (r.level, r.reliability);

-- Handler manages source
CREATE INDEX humint_rel_handles IF NOT EXISTS
FOR ()-[r:HANDLES]-() ON (r.assignedDate, r.isActive);

-- Debrief conducted with source
CREATE INDEX humint_rel_debriefed IF NOT EXISTS
FOR ()-[r:DEBRIEFED_BY]-() ON (r.debriefDate);

-- Intelligence derived from source
CREATE INDEX humint_rel_derived IF NOT EXISTS
FOR ()-[r:DERIVED_FROM_SOURCE]-() ON (r.derivedAt, r.confidence);

-- Source corroboration relationship
CREATE INDEX humint_rel_corroborates IF NOT EXISTS
FOR ()-[r:CORROBORATES]-() ON (r.confidence, r.evaluatedAt);

-- Source contradiction relationship
CREATE INDEX humint_rel_contradicts IF NOT EXISTS
FOR ()-[r:CONTRADICTS]-() ON (r.confidence, r.evaluatedAt);

-- Source recruitment chain
CREATE INDEX humint_rel_recruited IF NOT EXISTS
FOR ()-[r:RECRUITED_BY]-() ON (r.recruitedAt);

-- Source affiliation
CREATE INDEX humint_rel_affiliated IF NOT EXISTS
FOR ()-[r:AFFILIATED_WITH]-() ON (r.affiliationType, r.validFrom);

-- Source operational area
CREATE INDEX humint_rel_operates IF NOT EXISTS
FOR ()-[r:OPERATES_IN]-() ON (r.accessLevel);

-- Source compensation tracking
CREATE INDEX humint_rel_compensated IF NOT EXISTS
FOR ()-[r:COMPENSATED_BY]-() ON (r.paymentDate, r.amount);

-- Source tasking assignment
CREATE INDEX humint_rel_tasked IF NOT EXISTS
FOR ()-[r:TASKED_WITH]-() ON (r.priority, r.deadline);

-- ============================================================================
-- Composite Indexes for Common Query Patterns
-- ============================================================================

-- Active sources by handler (common dashboard query)
CREATE INDEX humint_active_by_handler IF NOT EXISTS
FOR (s:HumintSource) ON (s.handlerId, s.status, s.tenantId);

-- Sources needing contact (overdue contact query)
CREATE INDEX humint_contact_overdue IF NOT EXISTS
FOR (s:HumintSource) ON (s.status, s.lastContactDate, s.tenantId);

-- High-value sources (credibility + intel count)
CREATE INDEX humint_high_value IF NOT EXISTS
FOR (s:HumintSource) ON (s.credibilityScore, s.actionableIntelCount);

-- Pending debriefs by handler
CREATE INDEX humint_pending_debriefs IF NOT EXISTS
FOR (d:HumintDebrief) ON (d.handlerId, d.status, d.scheduledAt);

-- ============================================================================
-- Audit Trail Node
-- ============================================================================

-- HUMINT audit event constraint
CREATE CONSTRAINT humint_audit_id_unique IF NOT EXISTS
FOR (a:HumintAuditEvent) REQUIRE a.id IS UNIQUE;

-- Audit event indexes
CREATE INDEX humint_audit_source_idx IF NOT EXISTS
FOR (a:HumintAuditEvent) ON (a.sourceId, a.timestamp);

CREATE INDEX humint_audit_actor_idx IF NOT EXISTS
FOR (a:HumintAuditEvent) ON (a.actorId, a.timestamp);

CREATE INDEX humint_audit_type_idx IF NOT EXISTS
FOR (a:HumintAuditEvent) ON (a.eventType, a.timestamp);

-- ============================================================================
-- Risk Indicator Node
-- ============================================================================

CREATE CONSTRAINT humint_risk_indicator_id_unique IF NOT EXISTS
FOR (r:HumintRiskIndicator) REQUIRE r.id IS UNIQUE;

CREATE INDEX humint_risk_source_idx IF NOT EXISTS
FOR (r:HumintRiskIndicator) ON (r.sourceId, r.status);

CREATE INDEX humint_risk_severity_idx IF NOT EXISTS
FOR (r:HumintRiskIndicator) ON (r.severity, r.status);

-- ============================================================================
-- Graph Activity Node (for asset tracking)
-- ============================================================================

CREATE CONSTRAINT humint_activity_id_unique IF NOT EXISTS
FOR (a:HumintActivity) REQUIRE a.id IS UNIQUE;

CREATE INDEX humint_activity_source_idx IF NOT EXISTS
FOR (a:HumintActivity) ON (a.sourceId, a.timestamp);

CREATE INDEX humint_activity_type_idx IF NOT EXISTS
FOR (a:HumintActivity) ON (a.activityType, a.timestamp);

-- ============================================================================
-- Spatial Index for Asset Tracking (Neo4j 5.x)
-- ============================================================================

CREATE POINT INDEX humint_activity_location_idx IF NOT EXISTS
FOR (a:HumintActivity) ON (a.location);

CREATE POINT INDEX humint_source_lastknown_location_idx IF NOT EXISTS
FOR (s:HumintSource) ON (s.lastKnownLocation);
