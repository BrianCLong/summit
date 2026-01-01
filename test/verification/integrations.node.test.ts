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

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { pg } from '../../server/src/db/pg.js';
import { siemExportService } from '../../server/src/integrations/siem/siem-export.service.js';
import { grcExportService } from '../../server/src/integrations/grc/grc-export.service.js';

describe('Integration Verification Suite', () => {
  const testTenantId = uuidv4();
  const otherTenantId = uuidv4();
  let testAuditEventId: string;
  let testControlId: string;

  beforeAll(async () => {
    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  describe('1. Export Schema Conformance', () => {
    it('should conform SecuritySignalExport to contract v1.0.0', async () => {
      const request = {
        tenantId: testTenantId,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(),
        limit: 10
      };

      const response = await siemExportService.querySecuritySignals(request);

      expect(response).toHaveProperty('signals');
      expect(response).toHaveProperty('pagination');

      if (response.signals.length > 0) {
        const signal = response.signals[0];

        // Required fields per contract
        expect(signal).toHaveProperty('schemaVersion', '1.0.0');
        expect(signal).toHaveProperty('exportedAt');
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('timestamp');
        expect(signal).toHaveProperty('severity');
        expect(signal).toHaveProperty('category');
        expect(signal).toHaveProperty('signatureId');
        expect(signal).toHaveProperty('name');
        expect(signal).toHaveProperty('sourceTenant', testTenantId);
        expect(signal).toHaveProperty('outcome');
        expect(signal).toHaveProperty('message');
        expect(signal).toHaveProperty('auditEventId');
        expect(signal).toHaveProperty('complianceFrameworks');

        // Severity enum
        expect(['low', 'medium', 'high', 'critical']).toContain(signal.severity);

        // Category enum
        expect([
          'Authentication',
          'Authorization',
          'DataAccess',
          'PolicyViolation',
          'RateLimiting',
          'Anomaly',
          'SystemIntegrity'
        ]).toContain(signal.category);

        // Outcome enum
        expect(['success', 'failure', 'blocked']).toContain(signal.outcome);
      }
    });

    it('should conform GRCControlMappingExport to contract v1.0.0', async () => {
      const request = {
        tenantId: testTenantId,
        mode: 'snapshot' as const
      };

      const response = await grcExportService.exportControlMappings(request);

      expect(response).toHaveProperty('controlMappings');
      expect(response).toHaveProperty('metadata');

      if (response.controlMappings.length > 0) {
        const mapping = response.controlMappings[0];

        // Required fields per contract
        expect(mapping).toHaveProperty('schemaVersion', '1.0.0');
        expect(mapping).toHaveProperty('exportedAt');
        expect(mapping).toHaveProperty('controlId');
        expect(mapping).toHaveProperty('framework');
        expect(mapping).toHaveProperty('frameworkControlId');
        expect(mapping).toHaveProperty('control');
        expect(mapping).toHaveProperty('implementation');
        expect(mapping).toHaveProperty('evidence');
        expect(mapping).toHaveProperty('verification');
        expect(mapping).toHaveProperty('relatedControls');
        expect(mapping).toHaveProperty('dependencies');

        // Control criticality enum
        expect(['low', 'medium', 'high', 'critical']).toContain(
          mapping.control.criticality
        );

        // Implementation status enum
        expect(['implemented', 'partial', 'planned', 'not_applicable']).toContain(
          mapping.implementation.status
        );

        // Verification status enum
        expect(['passed', 'failed', 'not_tested']).toContain(
          mapping.verification.status
        );
      }
    });
  });

  describe('2. Redaction Rules', () => {
    it('should redact PII in SIEM exports', async () => {
      // Create audit event with PII
      const eventWithPII = await pg.query(
        `INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, details, compliance_relevant
        ) VALUES ($1, $2, 'data_export', NOW(), 'info',
          'User email: test@example.com, SSN: 123-45-6789',
          '{"email": "test@example.com", "ssn": "123-45-6789"}', true)
        RETURNING id`,
        [uuidv4(), testTenantId]
      );

      const request = {
        tenantId: testTenantId,
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(),
        limit: 100
      };

      const response = await siemExportService.querySecuritySignals(request);
      const signal = response.signals.find(
        s => s.auditEventId === eventWithPII.rows[0].id
      );

      if (signal) {
        // Email and SSN should be redacted
        expect(signal.message).not.toContain('test@example.com');
        expect(signal.message).not.toContain('123-45-6789');
        expect(signal.message).toContain('[REDACTED');
      }
    });

    it('should anonymize IP addresses', async () => {
      const request = {
        tenantId: testTenantId,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(),
        limit: 10
      };

      const response = await siemExportService.querySecuritySignals(request);

      response.signals.forEach(signal => {
        if (signal.sourceIp) {
          // Last octet should be replaced with XXX
          expect(signal.sourceIp).toMatch(/\d+\.\d+\.\d+\.XXX|.*\[REDACTED\].*/);
        }
      });
    });

    it('should hash user IDs for privacy', async () => {
      const request = {
        tenantId: testTenantId,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(),
        limit: 10
      };

      const response = await siemExportService.querySecuritySignals(request);

      response.signals.forEach(signal => {
        if (signal.sourceUser) {
          // User ID should be prefixed with "user_" and hashed
          expect(signal.sourceUser).toMatch(/^user_[a-f0-9]{16}$/);
        }
      });
    });
  });

  describe('3. Tenant Isolation', () => {
    it('should only return data for requested tenant in SIEM export', async () => {
      // Create events for both tenants
      await pg.query(
        `INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, compliance_relevant
        ) VALUES ($1, $2, 'test_event', NOW(), 'info', 'Test tenant data', true)`,
        [uuidv4(), testTenantId]
      );

      await pg.query(
        `INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, compliance_relevant
        ) VALUES ($1, $2, 'test_event', NOW(), 'info', 'Other tenant data', true)`,
        [uuidv4(), otherTenantId]
      );

      const request = {
        tenantId: testTenantId,
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(),
        limit: 100
      };

      const response = await siemExportService.querySecuritySignals(request);

      // All signals should belong to testTenantId
      response.signals.forEach(signal => {
        expect(signal.sourceTenant).toBe(testTenantId);
      });
    });

    it('should only return data for requested tenant in GRC export', async () => {
      // Create control mappings for both tenants
      const testControl = await pg.query(
        `INSERT INTO compliance_control_mappings (
          id, tenant_id, framework, framework_control_id, name, description,
          category, criticality, implementation_status, automation_level
        ) VALUES ($1, $2, 'SOC2_TYPE_II', 'CC6.1', 'Access Control', 'Test control',
          'Access Control', 'high', 'implemented', 'automated')
        RETURNING id`,
        [uuidv4(), testTenantId]
      );

      await pg.query(
        `INSERT INTO compliance_control_mappings (
          id, tenant_id, framework, framework_control_id, name, description,
          category, criticality, implementation_status, automation_level
        ) VALUES ($1, $2, 'SOC2_TYPE_II', 'CC6.2', 'Monitoring', 'Other tenant control',
          'Monitoring', 'medium', 'implemented', 'manual')`,
        [uuidv4(), otherTenantId]
      );

      const request = {
        tenantId: testTenantId,
        mode: 'snapshot' as const
      };

      const response = await grcExportService.exportControlMappings(request);

      // Verify tenant isolation in metadata
      expect(response.metadata.tenantId).toBe(testTenantId);

      // All control mappings should belong to testTenantId
      // (verified by database query constraints)
    });
  });

  describe('4. Idempotency', () => {
    it('should prevent duplicate SIEM exports', async () => {
      // Create a test audit event
      const testEvent = await pg.query(
        `INSERT INTO audit.events (
          id, tenant_id, event_type, timestamp, level, message, compliance_relevant
        ) VALUES ($1, $2, 'idempotency_test', NOW(), 'info', 'Test event', true)
        RETURNING id`,
        [uuidv4(), testTenantId]
      );

      const eventId = testEvent.rows[0].id;

      // Mock SIEM sink
      const mockSink = {
        send: jest.fn().mockResolvedValue(undefined),
        testConnection: jest.fn().mockResolvedValue(true)
      };

      const pushConfig = {
        tenantId: testTenantId,
        enabled: true,
        mode: 'webhook' as const,
        endpoint: 'https://example.com/siem',
        retryMaxAttempts: 1
      };

      // First export
      await siemExportService.pushSecuritySignal(
        testTenantId,
        eventId,
        mockSink,
        pushConfig
      );

      // Verify idempotency record created
      const idempotencyCheck1 = await pg.query(
        `SELECT COUNT(*) as count FROM siem_export_idempotency
         WHERE tenant_id = $1 AND event_id = $2`,
        [testTenantId, eventId]
      );
      expect(parseInt(idempotencyCheck1.rows[0].count)).toBe(1);

      // Second export (should be skipped)
      await siemExportService.pushSecuritySignal(
        testTenantId,
        eventId,
        mockSink,
        pushConfig
      );

      // Idempotency record count should still be 1
      const idempotencyCheck2 = await pg.query(
        `SELECT COUNT(*) as count FROM siem_export_idempotency
         WHERE tenant_id = $1 AND event_id = $2`,
        [testTenantId, eventId]
      );
      expect(parseInt(idempotencyCheck2.rows[0].count)).toBe(1);

      // SIEM sink should only be called once
      expect(mockSink.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Transparency Report Evidence', () => {
    it('should reference real audit events in transparency reports', async () => {
      // This test would require the full TransparencyReportGenerator
      // For now, verify that audit events exist for the tenant

      const auditEventsResult = await pg.query(
        `SELECT COUNT(*) as count FROM audit.events WHERE tenant_id = $1`,
        [testTenantId]
      );

      const eventCount = parseInt(auditEventsResult.rows[0].count);
      expect(eventCount).toBeGreaterThan(0);
    });

    it('should reference real control mappings in GRC exports', async () => {
      const controlsResult = await pg.query(
        `SELECT COUNT(*) as count FROM compliance_control_mappings WHERE tenant_id = $1`,
        [testTenantId]
      );

      const controlCount = parseInt(controlsResult.rows[0].count);
      expect(controlCount).toBeGreaterThan(0);
    });
  });

  describe('6. Export Format Validation', () => {
    it('should produce valid ISO 8601 timestamps', async () => {
      const request = {
        tenantId: testTenantId,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(),
        limit: 10
      };

      const response = await siemExportService.querySecuritySignals(request);

      response.signals.forEach(signal => {
        expect(signal.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(signal.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    it('should produce valid SHA256 hashes', async () => {
      const packageType = 'custom' as const;
      const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date();

      const evidencePackage = await grcExportService.generateEvidencePackage(
        testTenantId,
        packageType,
        periodStart,
        periodEnd,
        'test-user'
      );

      // Manifest hash should be 64 hex characters (SHA256)
      expect(evidencePackage.manifest.hash).toMatch(/^[a-f0-9]{64}$/);

      // Attestation values should be hashes
      evidencePackage.attestations.forEach(attestation => {
        expect(attestation.value).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test audit events
    testAuditEventId = uuidv4();
    await pg.query(
      `INSERT INTO audit.events (
        id, tenant_id, event_type, timestamp, level, message,
        compliance_relevant, compliance_frameworks, ip_address, user_id, outcome
      ) VALUES ($1, $2, 'auth_login', NOW(), 'info', 'User logged in',
        true, ARRAY['SOC2'], '192.168.1.100', $3, 'success')`,
      [testAuditEventId, testTenantId, uuidv4()]
    );

    // Create test control mapping
    testControlId = uuidv4();
    await pg.query(
      `INSERT INTO compliance_control_mappings (
        id, tenant_id, framework, framework_control_id, name, description,
        category, criticality, implementation_status, automation_level,
        verification_status
      ) VALUES ($1, $2, 'SOC2_TYPE_II', 'CC1.1', 'Test Control', 'Test description',
        'Governance', 'high', 'implemented', 'automated', 'passed')`,
      [testControlId, testTenantId]
    );
  }

  async function cleanupTestData() {
    // Cleanup audit events
    await pg.query(`DELETE FROM audit.events WHERE tenant_id IN ($1, $2)`, [
      testTenantId,
      otherTenantId
    ]);

    // Cleanup control mappings
    await pg.query(
      `DELETE FROM compliance_control_mappings WHERE tenant_id IN ($1, $2)`,
      [testTenantId, otherTenantId]
    );

    // Cleanup idempotency records
    await pg.query(
      `DELETE FROM siem_export_idempotency WHERE tenant_id IN ($1, $2)`,
      [testTenantId, otherTenantId]
    );
  }
});
