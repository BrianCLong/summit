"use strict";
/**
 * Integration Tests for PII Detection and Redaction System
 *
 * Tests the complete flow: ingestion → detection → tagging → redaction
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const recognizer_js_1 = require("../recognizer.js");
const sensitivity_js_1 = require("../sensitivity.js");
const ingestionHooks_js_1 = require("../ingestionHooks.js");
const redactionMiddleware_js_1 = require("../redactionMiddleware.js");
const copilotIntegration_js_1 = require("../copilotIntegration.js");
const testDatasets_js_1 = require("./fixtures/testDatasets.js");
(0, globals_1.describe)('PII Detection and Redaction Integration', () => {
    let recognizer;
    let classifier;
    let ingestionHook;
    let redactionMiddleware;
    let copilotGuard;
    (0, globals_1.beforeEach)(() => {
        recognizer = new recognizer_js_1.HybridEntityRecognizer();
        classifier = new sensitivity_js_1.SensitivityClassifier();
        ingestionHook = (0, ingestionHooks_js_1.createIngestionHook)({
            enabled: true,
            minimumConfidence: 0.7,
            autoTagCatalog: false, // Disable for testing
            strictMode: false,
        });
        redactionMiddleware = new redactionMiddleware_js_1.RedactionMiddleware();
        copilotGuard = new copilotIntegration_js_1.EnhancedGuardedGenerator();
    });
    (0, globals_1.describe)('Detection Accuracy', () => {
        (0, globals_1.it)('should detect low-sensitivity PII correctly', async () => {
            const record = testDatasets_js_1.lowSensitivityDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(false); // Low-severity data may not trigger detection
            (0, globals_1.expect)(result.blocked).toBe(false);
        });
        (0, globals_1.it)('should detect medium-sensitivity PII (names, addresses)', async () => {
            const record = testDatasets_js_1.mediumSensitivityDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(true);
            const piiTypes = result.entities.map(e => e.type);
            (0, globals_1.expect)(piiTypes).toContain('fullName');
            (0, globals_1.expect)(piiTypes).toContain('dateOfBirth');
            (0, globals_1.expect)(result.sensitivityMetadata?.sensitivityClass).toBe('CONFIDENTIAL');
        });
        (0, globals_1.it)('should detect high-sensitivity PII (emails, phones)', async () => {
            const record = testDatasets_js_1.highSensitivityDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(true);
            const piiTypes = result.entities.map(e => e.type);
            (0, globals_1.expect)(piiTypes).toContain('email');
            (0, globals_1.expect)(piiTypes).toContain('phoneNumber');
            (0, globals_1.expect)(piiTypes).toContain('driverLicenseNumber');
            (0, globals_1.expect)(result.sensitivityMetadata?.sensitivityClass).toBe('HIGHLY_SENSITIVE');
        });
        (0, globals_1.it)('should detect critical-sensitivity PII (SSN, credit cards)', async () => {
            const record = testDatasets_js_1.criticalSensitivityDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(true);
            const piiTypes = result.entities.map(e => e.type);
            (0, globals_1.expect)(piiTypes).toContain('socialSecurityNumber');
            (0, globals_1.expect)(piiTypes).toContain('creditCardNumber');
            (0, globals_1.expect)(piiTypes).toContain('password');
            (0, globals_1.expect)(result.sensitivityMetadata?.sensitivityClass).toBe('TOP_SECRET');
        });
        (0, globals_1.it)('should detect PHI in healthcare records', async () => {
            const record = testDatasets_js_1.healthcareDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(true);
            const piiTypes = result.entities.map(e => e.type);
            (0, globals_1.expect)(piiTypes).toContain('patientId');
            (0, globals_1.expect)(piiTypes).toContain('healthRecordNumber');
            (0, globals_1.expect)(piiTypes).toContain('medicalDiagnosis');
            (0, globals_1.expect)(result.sensitivityMetadata?.regulatoryTags).toContain('HIPAA');
        });
        (0, globals_1.it)('should detect PII in nested structures', async () => {
            const result = await ingestionHook.processRecord({
                id: testDatasets_js_1.nestedStructureDataset.id,
                data: testDatasets_js_1.nestedStructureDataset,
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(true);
            const piiTypes = result.entities.map(e => e.type);
            (0, globals_1.expect)(piiTypes).toContain('email');
            (0, globals_1.expect)(piiTypes).toContain('phoneNumber');
            (0, globals_1.expect)(piiTypes).toContain('socialSecurityNumber');
            (0, globals_1.expect)(piiTypes).toContain('password');
        });
    });
    (0, globals_1.describe)('Redaction by Role', () => {
        (0, globals_1.it)('should not redact anything for ADMIN users', async () => {
            const record = testDatasets_js_1.criticalSensitivityDataset[0];
            const result = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.admin);
            (0, globals_1.expect)(result.accessDenied).toBe(false);
            (0, globals_1.expect)(result.redactedCount).toBe(0);
            (0, globals_1.expect)(result.data.socialSecurityNumber).toBe(record.socialSecurityNumber);
            (0, globals_1.expect)(result.data.creditCardNumber).toBe(record.creditCardNumber);
        });
        (0, globals_1.it)('should partially redact critical PII for ANALYST users', async () => {
            const record = testDatasets_js_1.criticalSensitivityDataset[0];
            const result = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.analyst);
            (0, globals_1.expect)(result.accessDenied).toBe(false);
            (0, globals_1.expect)(result.redactedCount).toBeGreaterThan(0);
            // Critical PII should be fully redacted
            (0, globals_1.expect)(result.data.socialSecurityNumber).toBe('[REDACTED]');
            (0, globals_1.expect)(result.data.password).toBe('[REDACTED]');
            // High-severity PII may be partially masked
            // This depends on the specific implementation
        });
        (0, globals_1.it)('should deny access to critical data for VIEWER users', async () => {
            const record = testDatasets_js_1.criticalSensitivityDataset[0];
            const result = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.viewer);
            // VIEWER with clearance 1 cannot access critical data (requires clearance 5)
            (0, globals_1.expect)(result.accessDenied).toBe(true);
            (0, globals_1.expect)(result.denialReason).toContain('Step-up authentication required');
        });
        (0, globals_1.it)('should allow VIEWER access to low-sensitivity data', async () => {
            const record = testDatasets_js_1.lowSensitivityDataset[0];
            const result = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.viewer);
            (0, globals_1.expect)(result.accessDenied).toBe(false);
            (0, globals_1.expect)(result.data.username).toBe(record.username);
            (0, globals_1.expect)(result.data.city).toBe(record.city);
        });
    });
    (0, globals_1.describe)('Purpose-based Access Control', () => {
        (0, globals_1.it)('should require purpose for high-sensitivity data', async () => {
            const record = testDatasets_js_1.highSensitivityDataset[0];
            const userWithoutPurpose = {
                ...testDatasets_js_1.testUsers.analyst,
                purpose: undefined,
            };
            const result = await redactionMiddleware.redact(record, userWithoutPurpose);
            (0, globals_1.expect)(result.accessDenied).toBe(true);
            (0, globals_1.expect)(result.denialReason).toContain('Purpose justification required');
        });
        (0, globals_1.it)('should allow access with valid purpose', async () => {
            const record = testDatasets_js_1.highSensitivityDataset[0];
            const userWithPurpose = {
                ...testDatasets_js_1.testUsers.analyst,
                purpose: 'investigation',
            };
            const result = await redactionMiddleware.redact(record, userWithPurpose);
            (0, globals_1.expect)(result.accessDenied).toBe(false);
        });
    });
    (0, globals_1.describe)('Copilot Integration', () => {
        (0, globals_1.it)('should detect and redact PII in copilot output', async () => {
            const sensitiveOutput = `
        The user's email is robert.wilson@example.com and their
        phone number is +1-415-555-1234. Their SSN is 123-45-6789.
      `;
            const result = await copilotGuard.guard(sensitiveOutput, {
                user: testDatasets_js_1.testUsers.analyst,
                query: 'Find user contact information',
            });
            (0, globals_1.expect)(result.detectedEntities.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.redactedFields.length).toBeGreaterThan(0);
            // SSN should be redacted for ANALYST
            (0, globals_1.expect)(result.content).toContain('[REDACTED]');
            (0, globals_1.expect)(result.content).not.toContain('123-45-6789');
        });
        (0, globals_1.it)('should sanitize PII from copilot input prompts', async () => {
            const sensitivePrompt = `
        Look up information for SSN 123-45-6789 and credit card 4532-1234-5678-9010
      `;
            const result = await copilotGuard.guardInput(sensitivePrompt, {
                user: testDatasets_js_1.testUsers.analyst,
                query: sensitivePrompt,
            });
            (0, globals_1.expect)(result.detectedPII.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.sanitized).not.toContain('123-45-6789');
            (0, globals_1.expect)(result.sanitized).not.toContain('4532-1234-5678-9010');
            (0, globals_1.expect)(result.warnings.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should restrict copilot output based on user clearance', async () => {
            const sensitiveOutput = `
        The patient's SSN is 123-45-6789 and diagnosis is Type 2 Diabetes.
      `;
            const result = await copilotGuard.guard(sensitiveOutput, {
                user: testDatasets_js_1.testUsers.viewer,
                query: 'Get patient information',
            });
            (0, globals_1.expect)(result.restricted).toBe(true);
            (0, globals_1.expect)(result.content).toBe('[CONTENT REDACTED - Insufficient Clearance]');
            (0, globals_1.expect)(result.warnings.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Batch Processing', () => {
        (0, globals_1.it)('should process multiple records efficiently', async () => {
            const records = [
                ...testDatasets_js_1.lowSensitivityDataset,
                ...testDatasets_js_1.mediumSensitivityDataset,
                ...testDatasets_js_1.highSensitivityDataset,
            ].map(r => ({
                id: r.id,
                data: r,
                source: 'test',
            }));
            const results = await ingestionHook.processBatch(records);
            (0, globals_1.expect)(results.length).toBe(records.length);
            // Check that detection worked for each
            const detectedCount = results.filter(r => r.detected).length;
            (0, globals_1.expect)(detectedCount).toBeGreaterThan(0);
            // Verify no blocking in non-strict mode
            const blockedCount = results.filter(r => r.blocked).length;
            (0, globals_1.expect)(blockedCount).toBe(0);
        });
    });
    (0, globals_1.describe)('Strict Mode', () => {
        (0, globals_1.it)('should block ingestion of high-severity PII in strict mode', async () => {
            const strictHook = (0, ingestionHooks_js_1.createIngestionHook)({
                enabled: true,
                strictMode: true,
                minimumConfidence: 0.7,
            });
            const record = testDatasets_js_1.criticalSensitivityDataset[0];
            const result = await strictHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(true);
            (0, globals_1.expect)(result.blocked).toBe(true);
            (0, globals_1.expect)(result.blockReason).toContain('High-severity PII detected');
        });
    });
    (0, globals_1.describe)('Regulatory Compliance', () => {
        (0, globals_1.it)('should tag GDPR-applicable PII correctly', async () => {
            const record = testDatasets_js_1.highSensitivityDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.sensitivityMetadata?.regulatoryTags).toContain('GDPR');
        });
        (0, globals_1.it)('should tag HIPAA-applicable PHI correctly', async () => {
            const record = testDatasets_js_1.healthcareDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.sensitivityMetadata?.regulatoryTags).toContain('HIPAA');
        });
        (0, globals_1.it)('should tag PCI-DSS-applicable financial data correctly', async () => {
            const record = testDatasets_js_1.criticalSensitivityDataset[0];
            const result = await ingestionHook.processRecord({
                id: record.id,
                data: record,
                source: 'test',
            });
            (0, globals_1.expect)(result.sensitivityMetadata?.regulatoryTags).toContain('PCI_DSS');
        });
    });
    (0, globals_1.describe)('Audit Trail', () => {
        (0, globals_1.it)('should generate audit entries for data access', async () => {
            const record = testDatasets_js_1.highSensitivityDataset[0];
            const result = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.analyst);
            (0, globals_1.expect)(result.auditEntry).toBeDefined();
            (0, globals_1.expect)(result.auditEntry.userId).toBe(testDatasets_js_1.testUsers.analyst.userId);
            (0, globals_1.expect)(result.auditEntry.action).toBe('DATA_ACCESS');
            (0, globals_1.expect)(result.auditEntry.timestamp).toBeInstanceOf(Date);
            (0, globals_1.expect)(result.auditEntry.fieldsRedacted).toBeDefined();
            (0, globals_1.expect)(result.auditEntry.dlpRules).toBeDefined();
        });
        (0, globals_1.it)('should include purpose in audit trail when provided', async () => {
            const record = testDatasets_js_1.highSensitivityDataset[0];
            const result = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.analyst);
            (0, globals_1.expect)(result.auditEntry.purpose).toBe('analysis');
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.it)('should handle empty records gracefully', async () => {
            const result = await ingestionHook.processRecord({
                id: 'empty001',
                data: {},
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(false);
            (0, globals_1.expect)(result.blocked).toBe(false);
        });
        (0, globals_1.it)('should handle null values gracefully', async () => {
            const result = await ingestionHook.processRecord({
                id: 'null001',
                data: { name: null, email: null },
                source: 'test',
            });
            (0, globals_1.expect)(result.detected).toBe(false);
        });
        (0, globals_1.it)('should handle malformed data gracefully', async () => {
            const result = await redactionMiddleware.redact(null, testDatasets_js_1.testUsers.analyst);
            (0, globals_1.expect)(result.accessDenied).toBe(false);
            (0, globals_1.expect)(result.data).toBe(null);
        });
    });
});
(0, globals_1.describe)('End-to-End Acceptance Scenarios', () => {
    let ingestionHook;
    let redactionMiddleware;
    (0, globals_1.beforeEach)(() => {
        ingestionHook = (0, ingestionHooks_js_1.createIngestionHook)({
            enabled: true,
            minimumConfidence: 0.7,
            autoTagCatalog: false,
            strictMode: false,
        });
        redactionMiddleware = new redactionMiddleware_js_1.RedactionMiddleware();
    });
    (0, globals_1.it)('Scenario 1: Sample dataset with PII is correctly tagged on ingest', async () => {
        // Ingest a record with PII
        const record = testDatasets_js_1.criticalSensitivityDataset[0];
        const ingestionResult = await ingestionHook.processRecord({
            id: record.id,
            data: record,
            source: 'test-connector',
        });
        // Verify detection
        (0, globals_1.expect)(ingestionResult.detected).toBe(true);
        (0, globals_1.expect)(ingestionResult.entities.length).toBeGreaterThan(0);
        // Verify sensitivity classification
        (0, globals_1.expect)(ingestionResult.sensitivityMetadata).toBeDefined();
        (0, globals_1.expect)(ingestionResult.sensitivityMetadata?.sensitivityClass).toBe('TOP_SECRET');
        // Verify PII types are captured
        const piiTypes = ingestionResult.sensitivityMetadata?.piiTypes || [];
        (0, globals_1.expect)(piiTypes).toContain('socialSecurityNumber');
        (0, globals_1.expect)(piiTypes).toContain('creditCardNumber');
    });
    (0, globals_1.it)('Scenario 2: Users without sufficient clearance see only redacted versions', async () => {
        // Ingest and classify
        const record = testDatasets_js_1.criticalSensitivityDataset[0];
        // VIEWER tries to access critical data
        const viewerResult = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.viewer);
        // Should be denied due to insufficient clearance
        (0, globals_1.expect)(viewerResult.accessDenied).toBe(true);
        (0, globals_1.expect)(viewerResult.data).toBe(null);
        // ANALYST should see partial data
        const analystResult = await redactionMiddleware.redact(record, {
            ...testDatasets_js_1.testUsers.analyst,
            stepUpToken: 'valid-token', // Provide step-up
        });
        (0, globals_1.expect)(analystResult.accessDenied).toBe(false);
        (0, globals_1.expect)(analystResult.redactedCount).toBeGreaterThan(0);
        // ADMIN should see everything
        const adminResult = await redactionMiddleware.redact(record, testDatasets_js_1.testUsers.admin);
        (0, globals_1.expect)(adminResult.accessDenied).toBe(false);
        (0, globals_1.expect)(adminResult.redactedCount).toBe(0);
        (0, globals_1.expect)(adminResult.data).toEqual(record);
    });
    (0, globals_1.it)('Scenario 3: Copilot answers never expose sensitive fields to unauthorized roles', async () => {
        const copilotGuard = new copilotIntegration_js_1.EnhancedGuardedGenerator();
        const sensitiveAnswer = `
      User John Doe's SSN is 123-45-6789, email is john@example.com,
      and credit card number is 4532-1234-5678-9010.
    `;
        // VIEWER access
        const viewerResult = await copilotGuard.guard(sensitiveAnswer, {
            user: testDatasets_js_1.testUsers.viewer,
            query: 'Get user information',
        });
        (0, globals_1.expect)(viewerResult.restricted).toBe(true);
        (0, globals_1.expect)(viewerResult.content).not.toContain('123-45-6789');
        (0, globals_1.expect)(viewerResult.content).not.toContain('4532-1234-5678-9010');
        // ANALYST access
        const analystResult = await copilotGuard.guard(sensitiveAnswer, {
            user: testDatasets_js_1.testUsers.analyst,
            query: 'Get user information',
        });
        (0, globals_1.expect)(analystResult.restricted).toBe(false);
        (0, globals_1.expect)(analystResult.content).not.toContain('123-45-6789'); // SSN redacted
        (0, globals_1.expect)(analystResult.content).not.toContain('4532-1234-5678-9010'); // CC redacted
        (0, globals_1.expect)(analystResult.redactedFields).toContain('socialSecurityNumber');
        (0, globals_1.expect)(analystResult.redactedFields).toContain('creditCardNumber');
        // ADMIN access
        const adminResult = await copilotGuard.guard(sensitiveAnswer, {
            user: testDatasets_js_1.testUsers.admin,
            query: 'Get user information',
        });
        (0, globals_1.expect)(adminResult.restricted).toBe(false);
        (0, globals_1.expect)(adminResult.redactedFields.length).toBe(0);
        (0, globals_1.expect)(adminResult.content).toBe(sensitiveAnswer);
    });
});
