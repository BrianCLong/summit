// Compensation log index optimization

CREATE CONSTRAINT comp_log_id IF NOT EXISTS FOR (log:CompensationLog) REQUIRE log.id IS UNIQUE;
CREATE INDEX comp_log_tenant_status IF NOT EXISTS FOR (log:CompensationLog) ON (log.tenantId, log.status);
CREATE INDEX comp_log_tenant_ts IF NOT EXISTS FOR (log:CompensationLog) ON (log.tenantId, log.timestamp);
CREATE CONSTRAINT comp_compensator_id IF NOT EXISTS FOR (c:Compensator) REQUIRE c.id IS UNIQUE;
CREATE INDEX comp_compensator_created IF NOT EXISTS FOR (c:Compensator) ON (c.createdAt);
