/**
 * Integration Tests for PII Detection and Redaction System
 *
 * Tests the complete flow: ingestion → detection → tagging → redaction
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { HybridEntityRecognizer } from '../recognizer.js';
import { SensitivityClassifier } from '../sensitivity.js';
import { IngestionHook, createIngestionHook } from '../ingestionHooks.js';
import { RedactionMiddleware } from '../redactionMiddleware.js';
import { EnhancedGuardedGenerator } from '../copilotIntegration.js';
import {
  lowSensitivityDataset,
  mediumSensitivityDataset,
  highSensitivityDataset,
  criticalSensitivityDataset,
  healthcareDataset,
  nestedStructureDataset,
  testUsers,
  expectedDetections,
  expectedRedactions,
} from './fixtures/testDatasets.js';

describe('PII Detection and Redaction Integration', () => {
  let recognizer: HybridEntityRecognizer;
  let classifier: SensitivityClassifier;
  let ingestionHook: IngestionHook;
  let redactionMiddleware: RedactionMiddleware;
  let copilotGuard: EnhancedGuardedGenerator;

  beforeEach(() => {
    recognizer = new HybridEntityRecognizer();
    classifier = new SensitivityClassifier();
    ingestionHook = createIngestionHook({
      enabled: true,
      minimumConfidence: 0.7,
      autoTagCatalog: false, // Disable for testing
      strictMode: false,
    });
    redactionMiddleware = new RedactionMiddleware();
    copilotGuard = new EnhancedGuardedGenerator();
  });

  describe('Detection Accuracy', () => {
    it('should detect low-sensitivity PII correctly', async () => {
      const record = lowSensitivityDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.detected).toBe(false); // Low-severity data may not trigger detection
      expect(result.blocked).toBe(false);
    });

    it('should detect medium-sensitivity PII (names, addresses)', async () => {
      const record = mediumSensitivityDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.detected).toBe(true);
      const piiTypes = result.entities.map(e => e.type);
      expect(piiTypes).toContain('fullName');
      expect(piiTypes).toContain('dateOfBirth');

      expect(result.sensitivityMetadata?.sensitivityClass).toBe('CONFIDENTIAL');
    });

    it('should detect high-sensitivity PII (emails, phones)', async () => {
      const record = highSensitivityDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.detected).toBe(true);
      const piiTypes = result.entities.map(e => e.type);
      expect(piiTypes).toContain('email');
      expect(piiTypes).toContain('phoneNumber');
      expect(piiTypes).toContain('driverLicenseNumber');

      expect(result.sensitivityMetadata?.sensitivityClass).toBe('HIGHLY_SENSITIVE');
    });

    it('should detect critical-sensitivity PII (SSN, credit cards)', async () => {
      const record = criticalSensitivityDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.detected).toBe(true);
      const piiTypes = result.entities.map(e => e.type);
      expect(piiTypes).toContain('socialSecurityNumber');
      expect(piiTypes).toContain('creditCardNumber');
      expect(piiTypes).toContain('password');

      expect(result.sensitivityMetadata?.sensitivityClass).toBe('TOP_SECRET');
    });

    it('should detect PHI in healthcare records', async () => {
      const record = healthcareDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.detected).toBe(true);
      const piiTypes = result.entities.map(e => e.type);
      expect(piiTypes).toContain('patientId');
      expect(piiTypes).toContain('healthRecordNumber');
      expect(piiTypes).toContain('medicalDiagnosis');

      expect(result.sensitivityMetadata?.regulatoryTags).toContain('HIPAA');
    });

    it('should detect PII in nested structures', async () => {
      const result = await ingestionHook.processRecord({
        id: nestedStructureDataset.id,
        data: nestedStructureDataset,
        source: 'test',
      });

      expect(result.detected).toBe(true);
      const piiTypes = result.entities.map(e => e.type);
      expect(piiTypes).toContain('email');
      expect(piiTypes).toContain('phoneNumber');
      expect(piiTypes).toContain('socialSecurityNumber');
      expect(piiTypes).toContain('password');
    });
  });

  describe('Redaction by Role', () => {
    it('should not redact anything for ADMIN users', async () => {
      const record = criticalSensitivityDataset[0];
      const result = await redactionMiddleware.redact(record, testUsers.admin);

      expect(result.accessDenied).toBe(false);
      expect(result.redactedCount).toBe(0);
      expect(result.data.socialSecurityNumber).toBe(record.socialSecurityNumber);
      expect(result.data.creditCardNumber).toBe(record.creditCardNumber);
    });

    it('should partially redact critical PII for ANALYST users', async () => {
      const record = criticalSensitivityDataset[0];
      const result = await redactionMiddleware.redact(record, testUsers.analyst);

      expect(result.accessDenied).toBe(false);
      expect(result.redactedCount).toBeGreaterThan(0);

      // Critical PII should be fully redacted
      expect(result.data.socialSecurityNumber).toBe('[REDACTED]');
      expect(result.data.password).toBe('[REDACTED]');

      // High-severity PII may be partially masked
      // This depends on the specific implementation
    });

    it('should deny access to critical data for VIEWER users', async () => {
      const record = criticalSensitivityDataset[0];
      const result = await redactionMiddleware.redact(record, testUsers.viewer);

      // VIEWER with clearance 1 cannot access critical data (requires clearance 5)
      expect(result.accessDenied).toBe(true);
      expect(result.denialReason).toContain('Step-up authentication required');
    });

    it('should allow VIEWER access to low-sensitivity data', async () => {
      const record = lowSensitivityDataset[0];
      const result = await redactionMiddleware.redact(record, testUsers.viewer);

      expect(result.accessDenied).toBe(false);
      expect(result.data.username).toBe(record.username);
      expect(result.data.city).toBe(record.city);
    });
  });

  describe('Purpose-based Access Control', () => {
    it('should require purpose for high-sensitivity data', async () => {
      const record = highSensitivityDataset[0];
      const userWithoutPurpose = {
        ...testUsers.analyst,
        purpose: undefined,
      };

      const result = await redactionMiddleware.redact(record, userWithoutPurpose);

      expect(result.accessDenied).toBe(true);
      expect(result.denialReason).toContain('Purpose justification required');
    });

    it('should allow access with valid purpose', async () => {
      const record = highSensitivityDataset[0];
      const userWithPurpose = {
        ...testUsers.analyst,
        purpose: 'investigation' as const,
      };

      const result = await redactionMiddleware.redact(record, userWithPurpose);

      expect(result.accessDenied).toBe(false);
    });
  });

  describe('Copilot Integration', () => {
    it('should detect and redact PII in copilot output', async () => {
      const sensitiveOutput = `
        The user's email is robert.wilson@example.com and their
        phone number is +1-415-555-1234. Their SSN is 123-45-6789.
      `;

      const result = await copilotGuard.guard(sensitiveOutput, {
        user: testUsers.analyst,
        query: 'Find user contact information',
      });

      expect(result.detectedEntities.length).toBeGreaterThan(0);
      expect(result.redactedFields.length).toBeGreaterThan(0);

      // SSN should be redacted for ANALYST
      expect(result.content).toContain('[REDACTED]');
      expect(result.content).not.toContain('123-45-6789');
    });

    it('should sanitize PII from copilot input prompts', async () => {
      const sensitivePrompt = `
        Look up information for SSN 123-45-6789 and credit card 4532-1234-5678-9010
      `;

      const result = await copilotGuard.guardInput(sensitivePrompt, {
        user: testUsers.analyst,
        query: sensitivePrompt,
      });

      expect(result.detectedPII.length).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('123-45-6789');
      expect(result.sanitized).not.toContain('4532-1234-5678-9010');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should restrict copilot output based on user clearance', async () => {
      const sensitiveOutput = `
        The patient's SSN is 123-45-6789 and diagnosis is Type 2 Diabetes.
      `;

      const result = await copilotGuard.guard(sensitiveOutput, {
        user: testUsers.viewer,
        query: 'Get patient information',
      });

      expect(result.restricted).toBe(true);
      expect(result.content).toBe('[CONTENT REDACTED - Insufficient Clearance]');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple records efficiently', async () => {
      const records = [
        ...lowSensitivityDataset,
        ...mediumSensitivityDataset,
        ...highSensitivityDataset,
      ].map(r => ({
        id: r.id,
        data: r,
        source: 'test',
      }));

      const results = await ingestionHook.processBatch(records);

      expect(results.length).toBe(records.length);

      // Check that detection worked for each
      const detectedCount = results.filter(r => r.detected).length;
      expect(detectedCount).toBeGreaterThan(0);

      // Verify no blocking in non-strict mode
      const blockedCount = results.filter(r => r.blocked).length;
      expect(blockedCount).toBe(0);
    });
  });

  describe('Strict Mode', () => {
    it('should block ingestion of high-severity PII in strict mode', async () => {
      const strictHook = createIngestionHook({
        enabled: true,
        strictMode: true,
        minimumConfidence: 0.7,
      });

      const record = criticalSensitivityDataset[0];
      const result = await strictHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.detected).toBe(true);
      expect(result.blocked).toBe(true);
      expect(result.blockReason).toContain('High-severity PII detected');
    });
  });

  describe('Regulatory Compliance', () => {
    it('should tag GDPR-applicable PII correctly', async () => {
      const record = highSensitivityDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.sensitivityMetadata?.regulatoryTags).toContain('GDPR');
    });

    it('should tag HIPAA-applicable PHI correctly', async () => {
      const record = healthcareDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.sensitivityMetadata?.regulatoryTags).toContain('HIPAA');
    });

    it('should tag PCI-DSS-applicable financial data correctly', async () => {
      const record = criticalSensitivityDataset[0];
      const result = await ingestionHook.processRecord({
        id: record.id,
        data: record,
        source: 'test',
      });

      expect(result.sensitivityMetadata?.regulatoryTags).toContain('PCI_DSS');
    });
  });

  describe('Audit Trail', () => {
    it('should generate audit entries for data access', async () => {
      const record = highSensitivityDataset[0];
      const result = await redactionMiddleware.redact(record, testUsers.analyst);

      expect(result.auditEntry).toBeDefined();
      expect(result.auditEntry.userId).toBe(testUsers.analyst.userId);
      expect(result.auditEntry.action).toBe('DATA_ACCESS');
      expect(result.auditEntry.timestamp).toBeInstanceOf(Date);
      expect(result.auditEntry.fieldsRedacted).toBeDefined();
      expect(result.auditEntry.dlpRules).toBeDefined();
    });

    it('should include purpose in audit trail when provided', async () => {
      const record = highSensitivityDataset[0];
      const result = await redactionMiddleware.redact(record, testUsers.analyst);

      expect(result.auditEntry.purpose).toBe('analysis');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty records gracefully', async () => {
      const result = await ingestionHook.processRecord({
        id: 'empty001',
        data: {},
        source: 'test',
      });

      expect(result.detected).toBe(false);
      expect(result.blocked).toBe(false);
    });

    it('should handle null values gracefully', async () => {
      const result = await ingestionHook.processRecord({
        id: 'null001',
        data: { name: null, email: null },
        source: 'test',
      });

      expect(result.detected).toBe(false);
    });

    it('should handle malformed data gracefully', async () => {
      const result = await redactionMiddleware.redact(
        null,
        testUsers.analyst,
      );

      expect(result.accessDenied).toBe(false);
      expect(result.data).toBe(null);
    });
  });
});

describe('End-to-End Acceptance Scenarios', () => {
  let ingestionHook: IngestionHook;
  let redactionMiddleware: RedactionMiddleware;

  beforeEach(() => {
    ingestionHook = createIngestionHook({
      enabled: true,
      minimumConfidence: 0.7,
      autoTagCatalog: false,
      strictMode: false,
    });
    redactionMiddleware = new RedactionMiddleware();
  });

  it('Scenario 1: Sample dataset with PII is correctly tagged on ingest', async () => {
    // Ingest a record with PII
    const record = criticalSensitivityDataset[0];
    const ingestionResult = await ingestionHook.processRecord({
      id: record.id,
      data: record,
      source: 'test-connector',
    });

    // Verify detection
    expect(ingestionResult.detected).toBe(true);
    expect(ingestionResult.entities.length).toBeGreaterThan(0);

    // Verify sensitivity classification
    expect(ingestionResult.sensitivityMetadata).toBeDefined();
    expect(ingestionResult.sensitivityMetadata?.sensitivityClass).toBe('TOP_SECRET');

    // Verify PII types are captured
    const piiTypes = ingestionResult.sensitivityMetadata?.piiTypes || [];
    expect(piiTypes).toContain('socialSecurityNumber');
    expect(piiTypes).toContain('creditCardNumber');
  });

  it('Scenario 2: Users without sufficient clearance see only redacted versions', async () => {
    // Ingest and classify
    const record = criticalSensitivityDataset[0];

    // VIEWER tries to access critical data
    const viewerResult = await redactionMiddleware.redact(record, testUsers.viewer);

    // Should be denied due to insufficient clearance
    expect(viewerResult.accessDenied).toBe(true);
    expect(viewerResult.data).toBe(null);

    // ANALYST should see partial data
    const analystResult = await redactionMiddleware.redact(record, {
      ...testUsers.analyst,
      stepUpToken: 'valid-token', // Provide step-up
    });

    expect(analystResult.accessDenied).toBe(false);
    expect(analystResult.redactedCount).toBeGreaterThan(0);

    // ADMIN should see everything
    const adminResult = await redactionMiddleware.redact(record, testUsers.admin);

    expect(adminResult.accessDenied).toBe(false);
    expect(adminResult.redactedCount).toBe(0);
    expect(adminResult.data).toEqual(record);
  });

  it('Scenario 3: Copilot answers never expose sensitive fields to unauthorized roles', async () => {
    const copilotGuard = new EnhancedGuardedGenerator();

    const sensitiveAnswer = `
      User John Doe's SSN is 123-45-6789, email is john@example.com,
      and credit card number is 4532-1234-5678-9010.
    `;

    // VIEWER access
    const viewerResult = await copilotGuard.guard(sensitiveAnswer, {
      user: testUsers.viewer,
      query: 'Get user information',
    });

    expect(viewerResult.restricted).toBe(true);
    expect(viewerResult.content).not.toContain('123-45-6789');
    expect(viewerResult.content).not.toContain('4532-1234-5678-9010');

    // ANALYST access
    const analystResult = await copilotGuard.guard(sensitiveAnswer, {
      user: testUsers.analyst,
      query: 'Get user information',
    });

    expect(analystResult.restricted).toBe(false);
    expect(analystResult.content).not.toContain('123-45-6789'); // SSN redacted
    expect(analystResult.content).not.toContain('4532-1234-5678-9010'); // CC redacted
    expect(analystResult.redactedFields).toContain('socialSecurityNumber');
    expect(analystResult.redactedFields).toContain('creditCardNumber');

    // ADMIN access
    const adminResult = await copilotGuard.guard(sensitiveAnswer, {
      user: testUsers.admin,
      query: 'Get user information',
    });

    expect(adminResult.restricted).toBe(false);
    expect(adminResult.redactedFields.length).toBe(0);
    expect(adminResult.content).toBe(sensitiveAnswer);
  });
});
