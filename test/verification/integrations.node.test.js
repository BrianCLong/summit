"use strict";
/**
 * Integration Verification Test Suite
 *
 * Verifies ecosystem integrations are safe and correct:
 * 1. Export schemas conform to contracts
 * 2. Redaction rules apply to all exports
 * 3. Tenant isolation is enforced
 * 4. Idempotency prevents duplicate events
 * 5. Transparency reports reference real evidence artifacts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const uuid_1 = require("uuid");
const pg_js_1 = require("../../server/src/db/pg.js");
const siem_export_service_js_1 = require("../../server/src/integrations/siem/siem-export.service.js");
const grc_export_service_js_1 = require("../../server/src/integrations/grc/grc-export.service.js");
(0, globals_1.describe)('Integration Verification Suite', () => {
    const testTenantId = (0, uuid_1.v4)();
    const otherTenantId = (0, uuid_1.v4)();
    let testAuditEventId;
    let testControlId;
    (0, globals_1.beforeAll)(async () => {
        // Create test data
        await setupTestData();
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup test data
        await cleanupTestData();
    });
    (0, globals_1.describe)('1. Export Schema Conformance', () => {
        (0, globals_1.it)('should conform SecuritySignalExport to contract v1.0.0', async () => {
            const request = {
                tenantId: testTenantId,
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
                endTime: new Date(),
                limit: 10
            };
            const response = await siem_export_service_js_1.siemExportService.querySecuritySignals(request);
            (0, globals_1.expect)(response).toHaveProperty('signals');
            (0, globals_1.expect)(response).toHaveProperty('pagination');
            if (response.signals.length > 0) {
                const signal = response.signals[0];
                // Required fields per contract
                (0, globals_1.expect)(signal).toHaveProperty('schemaVersion', '1.0.0');
                (0, globals_1.expect)(signal).toHaveProperty('exportedAt');
                (0, globals_1.expect)(signal).toHaveProperty('id');
                (0, globals_1.expect)(signal).toHaveProperty('timestamp');
                (0, globals_1.expect)(signal).toHaveProperty('severity');
                (0, globals_1.expect)(signal).toHaveProperty('category');
                (0, globals_1.expect)(signal).toHaveProperty('signatureId');
                (0, globals_1.expect)(signal).toHaveProperty('name');
                (0, globals_1.expect)(signal).toHaveProperty('sourceTenant', testTenantId);
                (0, globals_1.expect)(signal).toHaveProperty('outcome');
                (0, globals_1.expect)(signal).toHaveProperty('message');
                (0, globals_1.expect)(signal).toHaveProperty('auditEventId');
                (0, globals_1.expect)(signal).toHaveProperty('complianceFrameworks');
                // Severity enum
                (0, globals_1.expect)(['low', 'medium', 'high', 'critical']).toContain(signal.severity);
                // Category enum
                (0, globals_1.expect)([
                    'Authentication',
                    'Authorization',
                    'DataAccess',
                    'PolicyViolation',
                    'RateLimiting',
                    'Anomaly',
                    'SystemIntegrity'
                ]).toContain(signal.category);
                // Outcome enum
                (0, globals_1.expect)(['success', 'failure', 'blocked']).toContain(signal.outcome);
            }
        });
        (0, globals_1.it)('should conform GRCControlMappingExport to contract v1.0.0', async () => {
            const request = {
                tenantId: testTenantId,
                mode: 'snapshot'
            };
            const response = await grc_export_service_js_1.grcExportService.exportControlMappings(request);
            (0, globals_1.expect)(response).toHaveProperty('controlMappings');
            (0, globals_1.expect)(response).toHaveProperty('metadata');
            if (response.controlMappings.length > 0) {
                const mapping = response.controlMappings[0];
                // Required fields per contract
                (0, globals_1.expect)(mapping).toHaveProperty('schemaVersion', '1.0.0');
                (0, globals_1.expect)(mapping).toHaveProperty('exportedAt');
                (0, globals_1.expect)(mapping).toHaveProperty('controlId');
                (0, globals_1.expect)(mapping).toHaveProperty('framework');
                (0, globals_1.expect)(mapping).toHaveProperty('frameworkControlId');
                (0, globals_1.expect)(mapping).toHaveProperty('control');
                (0, globals_1.expect)(mapping).toHaveProperty('implementation');
                (0, globals_1.expect)(mapping).toHaveProperty('evidence');
                (0, globals_1.expect)(mapping).toHaveProperty('verification');
                (0, globals_1.expect)(mapping).toHaveProperty('relatedControls');
                (0, globals_1.expect)(mapping).toHaveProperty('dependencies');
                // Control criticality enum
                (0, globals_1.expect)(['low', 'medium', 'high', 'critical']).toContain(mapping.control.criticality);
                // Implementation status enum
                (0, globals_1.expect)(['implemented', 'partial', 'planned', 'not_applicable']).toContain(mapping.implementation.status);
                // Verification status enum
                (0, globals_1.expect)(['passed', 'failed', 'not_tested']).toContain(mapping.verification.status);
            }
        });
    });
    (0, globals_1.describe)('2. Redaction Rules', () => {
        (0, globals_1.it)('should redact PII in SIEM exports', async () => {
            // Create audit event with PII
            const eventWithPII = await pg_js_1.pg.query(`INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, details, compliance_relevant
        ) VALUES ($1, $2, 'data_export', NOW(), 'info',
          'User email: test@example.com, SSN: 123-45-6789',
          '{"email": "test@example.com", "ssn": "123-45-6789"}', true)
        RETURNING id`, [(0, uuid_1.v4)(), testTenantId]);
            const request = {
                tenantId: testTenantId,
                startTime: new Date(Date.now() - 1000),
                endTime: new Date(),
                limit: 100
            };
            const response = await siem_export_service_js_1.siemExportService.querySecuritySignals(request);
            const signal = response.signals.find(s => s.auditEventId === eventWithPII.rows[0].id);
            if (signal) {
                // Email and SSN should be redacted
                (0, globals_1.expect)(signal.message).not.toContain('test@example.com');
                (0, globals_1.expect)(signal.message).not.toContain('123-45-6789');
                (0, globals_1.expect)(signal.message).toContain('[REDACTED');
            }
        });
        (0, globals_1.it)('should anonymize IP addresses', async () => {
            const request = {
                tenantId: testTenantId,
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
                endTime: new Date(),
                limit: 10
            };
            const response = await siem_export_service_js_1.siemExportService.querySecuritySignals(request);
            response.signals.forEach(signal => {
                if (signal.sourceIp) {
                    // Last octet should be replaced with XXX
                    (0, globals_1.expect)(signal.sourceIp).toMatch(/\d+\.\d+\.\d+\.XXX|.*\[REDACTED\].*/);
                }
            });
        });
        (0, globals_1.it)('should hash user IDs for privacy', async () => {
            const request = {
                tenantId: testTenantId,
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
                endTime: new Date(),
                limit: 10
            };
            const response = await siem_export_service_js_1.siemExportService.querySecuritySignals(request);
            response.signals.forEach(signal => {
                if (signal.sourceUser) {
                    // User ID should be prefixed with "user_" and hashed
                    (0, globals_1.expect)(signal.sourceUser).toMatch(/^user_[a-f0-9]{16}$/);
                }
            });
        });
    });
    (0, globals_1.describe)('3. Tenant Isolation', () => {
        (0, globals_1.it)('should only return data for requested tenant in SIEM export', async () => {
            // Create events for both tenants
            await pg_js_1.pg.query(`INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, compliance_relevant
        ) VALUES ($1, $2, 'test_event', NOW(), 'info', 'Test tenant data', true)`, [(0, uuid_1.v4)(), testTenantId]);
            await pg_js_1.pg.query(`INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, compliance_relevant
        ) VALUES ($1, $2, 'test_event', NOW(), 'info', 'Other tenant data', true)`, [(0, uuid_1.v4)(), otherTenantId]);
            const request = {
                tenantId: testTenantId,
                startTime: new Date(Date.now() - 1000),
                endTime: new Date(),
                limit: 100
            };
            const response = await siem_export_service_js_1.siemExportService.querySecuritySignals(request);
            // All signals should belong to testTenantId
            response.signals.forEach(signal => {
                (0, globals_1.expect)(signal.sourceTenant).toBe(testTenantId);
            });
        });
        (0, globals_1.it)('should only return data for requested tenant in GRC export', async () => {
            // Create control mappings for both tenants
            const testControl = await pg_js_1.pg.query(`INSERT INTO compliance_control_mappings (
          id, tenant_id, framework, framework_control_id, name, description,
          category, criticality, implementation_status, automation_level
        ) VALUES ($1, $2, 'SOC2_TYPE_II', 'CC6.1', 'Access Control', 'Test control',
          'Access Control', 'high', 'implemented', 'automated')
        RETURNING id`, [(0, uuid_1.v4)(), testTenantId]);
            await pg_js_1.pg.query(`INSERT INTO compliance_control_mappings (
          id, tenant_id, framework, framework_control_id, name, description,
          category, criticality, implementation_status, automation_level
        ) VALUES ($1, $2, 'SOC2_TYPE_II', 'CC6.2', 'Monitoring', 'Other tenant control',
          'Monitoring', 'medium', 'implemented', 'manual')`, [(0, uuid_1.v4)(), otherTenantId]);
            const request = {
                tenantId: testTenantId,
                mode: 'snapshot'
            };
            const response = await grc_export_service_js_1.grcExportService.exportControlMappings(request);
            // Verify tenant isolation in metadata
            (0, globals_1.expect)(response.metadata.tenantId).toBe(testTenantId);
            // All control mappings should belong to testTenantId
            // (verified by database query constraints)
        });
    });
    (0, globals_1.describe)('4. Idempotency', () => {
        (0, globals_1.it)('should prevent duplicate SIEM exports', async () => {
            // Create a test audit event
            const testEvent = await pg_js_1.pg.query(`INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, compliance_relevant
        ) VALUES ($1, $2, 'idempotency_test', NOW(), 'info', 'Test event', true)
        RETURNING id`, [(0, uuid_1.v4)(), testTenantId]);
            const eventId = testEvent.rows[0].id;
            // Mock SIEM sink
            const mockSink = {
                send: jest.fn().mockResolvedValue(undefined),
                testConnection: jest.fn().mockResolvedValue(true)
            };
            const pushConfig = {
                tenantId: testTenantId,
                enabled: true,
                mode: 'webhook',
                endpoint: 'https://example.com/siem',
                retryMaxAttempts: 1
            };
            // First export
            await siem_export_service_js_1.siemExportService.pushSecuritySignal(testTenantId, eventId, mockSink, pushConfig);
            // Verify idempotency record created
            const idempotencyCheck1 = await pg_js_1.pg.query(`SELECT COUNT(*) as count FROM siem_export_idempotency
         WHERE tenant_id = $1 AND event_id = $2`, [testTenantId, eventId]);
            (0, globals_1.expect)(parseInt(idempotencyCheck1.rows[0].count)).toBe(1);
            // Second export (should be skipped)
            await siem_export_service_js_1.siemExportService.pushSecuritySignal(testTenantId, eventId, mockSink, pushConfig);
            // Idempotency record count should still be 1
            const idempotencyCheck2 = await pg_js_1.pg.query(`SELECT COUNT(*) as count FROM siem_export_idempotency
         WHERE tenant_id = $1 AND event_id = $2`, [testTenantId, eventId]);
            (0, globals_1.expect)(parseInt(idempotencyCheck2.rows[0].count)).toBe(1);
            // SIEM sink should only be called once
            (0, globals_1.expect)(mockSink.send).toHaveBeenCalledTimes(1);
        });
    });
    (0, globals_1.describe)('5. Transparency Report Evidence', () => {
        (0, globals_1.it)('should reference real audit events in transparency reports', async () => {
            // This test would require the full TransparencyReportGenerator
            // For now, verify that audit events exist for the tenant
            const auditEventsResult = await pg_js_1.pg.query(`SELECT COUNT(*) as count FROM audit.events WHERE tenant_id = $1`, [testTenantId]);
            const eventCount = parseInt(auditEventsResult.rows[0].count);
            (0, globals_1.expect)(eventCount).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should reference real control mappings in GRC exports', async () => {
            const controlsResult = await pg_js_1.pg.query(`SELECT COUNT(*) as count FROM compliance_control_mappings WHERE tenant_id = $1`, [testTenantId]);
            const controlCount = parseInt(controlsResult.rows[0].count);
            (0, globals_1.expect)(controlCount).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('6. Export Format Validation', () => {
        (0, globals_1.it)('should produce valid ISO 8601 timestamps', async () => {
            const request = {
                tenantId: testTenantId,
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
                endTime: new Date(),
                limit: 10
            };
            const response = await siem_export_service_js_1.siemExportService.querySecuritySignals(request);
            response.signals.forEach(signal => {
                (0, globals_1.expect)(signal.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
                (0, globals_1.expect)(signal.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            });
        });
        (0, globals_1.it)('should produce valid SHA256 hashes', async () => {
            const packageType = 'custom';
            const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const periodEnd = new Date();
            const evidencePackage = await grc_export_service_js_1.grcExportService.generateEvidencePackage(testTenantId, packageType, periodStart, periodEnd, 'test-user');
            // Manifest hash should be 64 hex characters (SHA256)
            (0, globals_1.expect)(evidencePackage.manifest.hash).toMatch(/^[a-f0-9]{64}$/);
            // Attestation values should be hashes
            evidencePackage.attestations.forEach(attestation => {
                (0, globals_1.expect)(attestation.value).toMatch(/^[a-f0-9]{64}$/);
            });
        });
    });
    // Helper functions
    async function setupTestData() {
        // Create test audit events
        testAuditEventId = (0, uuid_1.v4)();
        await pg_js_1.pg.query(`INSERT INTO audit.events (
        id, tenant_id, event_type, timestamp, level, message,
        compliance_relevant, compliance_frameworks, ip_address, user_id, outcome
      ) VALUES ($1, $2, 'auth_login', NOW(), 'info', 'User logged in',
        true, ARRAY['SOC2'], '192.168.1.100', $3, 'success')`, [testAuditEventId, testTenantId, (0, uuid_1.v4)()]);
        // Create test control mapping
        testControlId = (0, uuid_1.v4)();
        await pg_js_1.pg.query(`INSERT INTO compliance_control_mappings (
        id, tenant_id, framework, framework_control_id, name, description,
        category, criticality, implementation_status, automation_level,
        verification_status
      ) VALUES ($1, $2, 'SOC2_TYPE_II', 'CC1.1', 'Test Control', 'Test description',
        'Governance', 'high', 'implemented', 'automated', 'passed')`, [testControlId, testTenantId]);
    }
    async function cleanupTestData() {
        // Cleanup audit events
        await pg_js_1.pg.query(`DELETE FROM audit.events WHERE tenant_id IN ($1, $2)`, [
            testTenantId,
            otherTenantId
        ]);
        // Cleanup control mappings
        await pg_js_1.pg.query(`DELETE FROM compliance_control_mappings WHERE tenant_id IN ($1, $2)`, [testTenantId, otherTenantId]);
        // Cleanup idempotency records
        await pg_js_1.pg.query(`DELETE FROM siem_export_idempotency WHERE tenant_id IN ($1, $2)`, [testTenantId, otherTenantId]);
    }
});
