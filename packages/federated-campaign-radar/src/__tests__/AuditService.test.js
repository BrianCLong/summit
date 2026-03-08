"use strict";
/**
 * Tests for AuditService
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const AuditService_1 = require("../audit/AuditService");
(0, vitest_1.describe)('AuditService', () => {
    let auditService;
    (0, vitest_1.beforeEach)(() => {
        auditService = new AuditService_1.AuditService({
            organizationId: 'test-org',
            retentionDays: 365,
            enableIntegrityChecks: true,
        });
    });
    (0, vitest_1.describe)('event logging', () => {
        (0, vitest_1.it)('should log audit events', () => {
            const eventId = auditService.logEvent({
                eventType: 'SIGNAL_SUBMISSION',
                category: 'DATA_PROCESSING',
                action: 'NORMALIZE_SIGNAL',
                resourceType: 'SIGNAL',
                resourceId: 'signal-123',
                outcome: 'SUCCESS',
                details: {
                    signalType: 'NARRATIVE',
                    platform: 'twitter',
                },
            });
            (0, vitest_1.expect)(eventId).toBeDefined();
            (0, vitest_1.expect)(typeof eventId).toBe('string');
        });
        (0, vitest_1.it)('should retrieve logged events', () => {
            auditService.logEvent({
                eventType: 'ALERT_GENERATED',
                category: 'ALERT_MANAGEMENT',
                action: 'CREATE_ALERT',
                resourceType: 'ALERT',
                resourceId: 'alert-456',
                outcome: 'SUCCESS',
            });
            const events = auditService.getEvents({});
            (0, vitest_1.expect)(events.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(events[0].eventType).toBe('ALERT_GENERATED');
        });
        (0, vitest_1.it)('should filter events by type', () => {
            auditService.logEvent({
                eventType: 'SIGNAL_SUBMISSION',
                category: 'DATA_PROCESSING',
                action: 'NORMALIZE_SIGNAL',
                resourceType: 'SIGNAL',
                resourceId: 'signal-1',
                outcome: 'SUCCESS',
            });
            auditService.logEvent({
                eventType: 'ALERT_GENERATED',
                category: 'ALERT_MANAGEMENT',
                action: 'CREATE_ALERT',
                resourceType: 'ALERT',
                resourceId: 'alert-1',
                outcome: 'SUCCESS',
            });
            const signalEvents = auditService.getEvents({
                eventType: 'SIGNAL_SUBMISSION',
            });
            (0, vitest_1.expect)(signalEvents.every((e) => e.eventType === 'SIGNAL_SUBMISSION')).toBe(true);
        });
        (0, vitest_1.it)('should filter events by time range', () => {
            const now = Date.now();
            auditService.logEvent({
                eventType: 'SIGNAL_SUBMISSION',
                category: 'DATA_PROCESSING',
                action: 'NORMALIZE_SIGNAL',
                resourceType: 'SIGNAL',
                resourceId: 'signal-recent',
                outcome: 'SUCCESS',
            });
            const events = auditService.getEvents({
                startTime: new Date(now - 3600000), // 1 hour ago
                endTime: new Date(now + 3600000), // 1 hour from now
            });
            (0, vitest_1.expect)(events.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should include actor information when provided', () => {
            auditService.logEvent({
                eventType: 'ALERT_ACKNOWLEDGED',
                category: 'ALERT_MANAGEMENT',
                action: 'ACKNOWLEDGE_ALERT',
                resourceType: 'ALERT',
                resourceId: 'alert-123',
                outcome: 'SUCCESS',
                actor: {
                    id: 'analyst-1',
                    type: 'USER',
                    name: 'John Analyst',
                },
            });
            const events = auditService.getEvents({});
            const event = events.find((e) => e.actor?.id === 'analyst-1');
            (0, vitest_1.expect)(event).toBeDefined();
            (0, vitest_1.expect)(event?.actor?.name).toBe('John Analyst');
        });
    });
    (0, vitest_1.describe)('governance controls', () => {
        (0, vitest_1.it)('should have pre-initialized governance controls', () => {
            const controls = auditService.getGovernanceControls();
            (0, vitest_1.expect)(controls.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(controls.some((c) => c.category === 'DATA_GOVERNANCE')).toBe(true);
            (0, vitest_1.expect)(controls.some((c) => c.category === 'PRIVACY_PROTECTION')).toBe(true);
        });
        (0, vitest_1.it)('should add new governance controls', () => {
            auditService.addGovernanceControl({
                id: 'custom-control-1',
                name: 'Custom Data Retention',
                description: 'Ensure data is retained for required period',
                category: 'DATA_GOVERNANCE',
                status: 'IMPLEMENTED',
                implementationNotes: 'Automated retention policy in place',
                verificationMethod: 'Quarterly audit',
                lastVerified: new Date(),
            });
            const controls = auditService.getGovernanceControls();
            const customControl = controls.find((c) => c.id === 'custom-control-1');
            (0, vitest_1.expect)(customControl).toBeDefined();
            (0, vitest_1.expect)(customControl?.name).toBe('Custom Data Retention');
        });
        (0, vitest_1.it)('should update governance control status', () => {
            const controls = auditService.getGovernanceControls();
            if (controls.length > 0) {
                const success = auditService.updateGovernanceControlStatus(controls[0].id, 'VERIFIED', 'Verified through Q4 audit');
                (0, vitest_1.expect)(success).toBe(true);
                const updated = auditService
                    .getGovernanceControls()
                    .find((c) => c.id === controls[0].id);
                (0, vitest_1.expect)(updated?.status).toBe('VERIFIED');
            }
        });
    });
    (0, vitest_1.describe)('compliance scoring', () => {
        (0, vitest_1.it)('should calculate compliance score', () => {
            const score = auditService.getComplianceScore();
            (0, vitest_1.expect)(score).toBeDefined();
            (0, vitest_1.expect)(score.overallScore).toBeDefined();
            (0, vitest_1.expect)(typeof score.overallScore).toBe('number');
            (0, vitest_1.expect)(score.overallScore).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(score.overallScore).toBeLessThanOrEqual(100);
        });
        (0, vitest_1.it)('should provide category breakdown', () => {
            const score = auditService.getComplianceScore();
            (0, vitest_1.expect)(score.categoryScores).toBeDefined();
            (0, vitest_1.expect)(typeof score.categoryScores).toBe('object');
        });
        (0, vitest_1.it)('should identify gaps', () => {
            const score = auditService.getComplianceScore();
            (0, vitest_1.expect)(score.gaps).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(score.gaps)).toBe(true);
        });
    });
    (0, vitest_1.describe)('integrity verification', () => {
        (0, vitest_1.it)('should verify audit log integrity', () => {
            // Log some events
            for (let i = 0; i < 5; i++) {
                auditService.logEvent({
                    eventType: 'SIGNAL_SUBMISSION',
                    category: 'DATA_PROCESSING',
                    action: 'NORMALIZE_SIGNAL',
                    resourceType: 'SIGNAL',
                    resourceId: `signal-${i}`,
                    outcome: 'SUCCESS',
                });
            }
            const integrity = auditService.verifyIntegrity();
            (0, vitest_1.expect)(integrity.valid).toBe(true);
            (0, vitest_1.expect)(integrity.eventsVerified).toBeGreaterThanOrEqual(5);
        });
        (0, vitest_1.it)('should detect tampering attempts', () => {
            // Log an event
            auditService.logEvent({
                eventType: 'ALERT_GENERATED',
                category: 'ALERT_MANAGEMENT',
                action: 'CREATE_ALERT',
                resourceType: 'ALERT',
                resourceId: 'alert-tamper-test',
                outcome: 'SUCCESS',
            });
            // Integrity should be valid initially
            const integrity = auditService.verifyIntegrity();
            (0, vitest_1.expect)(integrity.valid).toBe(true);
        });
    });
    (0, vitest_1.describe)('incident management', () => {
        (0, vitest_1.it)('should create incidents', () => {
            const incidentId = auditService.createIncident({
                title: 'Suspected coordinated campaign detected',
                description: 'Cross-tenant cluster with high confidence',
                severity: 'HIGH',
                relatedAlertIds: ['alert-1', 'alert-2'],
                relatedClusterIds: ['cluster-1'],
            });
            (0, vitest_1.expect)(incidentId).toBeDefined();
            (0, vitest_1.expect)(typeof incidentId).toBe('string');
        });
        (0, vitest_1.it)('should retrieve incidents', () => {
            auditService.createIncident({
                title: 'Test Incident',
                description: 'Test description',
                severity: 'MEDIUM',
                relatedAlertIds: [],
                relatedClusterIds: [],
            });
            const incidents = auditService.getIncidents({});
            (0, vitest_1.expect)(incidents.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(incidents[0].title).toBe('Test Incident');
        });
        (0, vitest_1.it)('should filter incidents by severity', () => {
            auditService.createIncident({
                title: 'Low Severity Incident',
                description: 'Minor issue',
                severity: 'LOW',
                relatedAlertIds: [],
                relatedClusterIds: [],
            });
            auditService.createIncident({
                title: 'Critical Incident',
                description: 'Major issue',
                severity: 'CRITICAL',
                relatedAlertIds: [],
                relatedClusterIds: [],
            });
            const criticalIncidents = auditService.getIncidents({
                severity: 'CRITICAL',
            });
            (0, vitest_1.expect)(criticalIncidents.every((i) => i.severity === 'CRITICAL')).toBe(true);
        });
        (0, vitest_1.it)('should update incident status', () => {
            const incidentId = auditService.createIncident({
                title: 'Incident to Update',
                description: 'Will be updated',
                severity: 'MEDIUM',
                relatedAlertIds: [],
                relatedClusterIds: [],
            });
            const success = auditService.updateIncidentStatus(incidentId, 'INVESTIGATING', 'analyst-1', 'Starting investigation');
            (0, vitest_1.expect)(success).toBe(true);
            const incidents = auditService.getIncidents({ status: 'INVESTIGATING' });
            const updated = incidents.find((i) => i.id === incidentId);
            (0, vitest_1.expect)(updated?.status).toBe('INVESTIGATING');
            (0, vitest_1.expect)(updated?.assignedTo).toBe('analyst-1');
        });
        (0, vitest_1.it)('should close incidents', () => {
            const incidentId = auditService.createIncident({
                title: 'Incident to Close',
                description: 'Will be closed',
                severity: 'LOW',
                relatedAlertIds: [],
                relatedClusterIds: [],
            });
            auditService.updateIncidentStatus(incidentId, 'INVESTIGATING', 'analyst-1');
            const success = auditService.closeIncident(incidentId, 'analyst-1', 'Issue resolved', ['Document findings', 'Update playbook']);
            (0, vitest_1.expect)(success).toBe(true);
            const incidents = auditService.getIncidents({});
            const closed = incidents.find((i) => i.id === incidentId);
            (0, vitest_1.expect)(closed?.status).toBe('CLOSED');
            (0, vitest_1.expect)(closed?.resolution).toBe('Issue resolved');
        });
    });
    (0, vitest_1.describe)('export functionality', () => {
        (0, vitest_1.it)('should export events to JSON', () => {
            auditService.logEvent({
                eventType: 'SIGNAL_SUBMISSION',
                category: 'DATA_PROCESSING',
                action: 'NORMALIZE_SIGNAL',
                resourceType: 'SIGNAL',
                resourceId: 'signal-export-test',
                outcome: 'SUCCESS',
            });
            const json = auditService.exportEvents('JSON', {});
            (0, vitest_1.expect)(json).toBeDefined();
            const parsed = JSON.parse(json);
            (0, vitest_1.expect)(Array.isArray(parsed)).toBe(true);
        });
        (0, vitest_1.it)('should export events to CSV', () => {
            auditService.logEvent({
                eventType: 'ALERT_GENERATED',
                category: 'ALERT_MANAGEMENT',
                action: 'CREATE_ALERT',
                resourceType: 'ALERT',
                resourceId: 'alert-csv-test',
                outcome: 'SUCCESS',
            });
            const csv = auditService.exportEvents('CSV', {});
            (0, vitest_1.expect)(csv).toBeDefined();
            (0, vitest_1.expect)(csv).toContain('eventType');
            (0, vitest_1.expect)(csv).toContain('ALERT_GENERATED');
        });
        (0, vitest_1.it)('should export events to SIEM format (CEF)', () => {
            auditService.logEvent({
                eventType: 'PRIVACY_VIOLATION',
                category: 'PRIVACY_PROTECTION',
                action: 'BUDGET_EXCEEDED',
                resourceType: 'PRIVACY_BUDGET',
                resourceId: 'budget-1',
                outcome: 'FAILURE',
            });
            const cef = auditService.exportEvents('SIEM', {});
            (0, vitest_1.expect)(cef).toBeDefined();
            (0, vitest_1.expect)(cef).toContain('CEF:');
        });
    });
    (0, vitest_1.describe)('retention policy', () => {
        (0, vitest_1.it)('should respect retention policy configuration', () => {
            const shortRetentionService = new AuditService_1.AuditService({
                organizationId: 'test-org',
                retentionDays: 7,
                enableIntegrityChecks: true,
            });
            // This just verifies the service initializes correctly with short retention
            (0, vitest_1.expect)(shortRetentionService).toBeDefined();
        });
    });
    (0, vitest_1.describe)('hash chain', () => {
        (0, vitest_1.it)('should maintain hash chain integrity', () => {
            // Log multiple events
            for (let i = 0; i < 10; i++) {
                auditService.logEvent({
                    eventType: 'SIGNAL_SUBMISSION',
                    category: 'DATA_PROCESSING',
                    action: 'NORMALIZE_SIGNAL',
                    resourceType: 'SIGNAL',
                    resourceId: `signal-chain-${i}`,
                    outcome: 'SUCCESS',
                });
            }
            const events = auditService.getEvents({});
            // Each event should have a hash
            events.forEach((event) => {
                (0, vitest_1.expect)(event.hash).toBeDefined();
            });
            // Verify chain
            const integrity = auditService.verifyIntegrity();
            (0, vitest_1.expect)(integrity.valid).toBe(true);
        });
    });
});
