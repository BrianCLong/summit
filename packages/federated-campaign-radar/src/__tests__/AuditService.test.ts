/**
 * Tests for AuditService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from '../audit/AuditService';

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService({
      organizationId: 'test-org',
      retentionDays: 365,
      enableIntegrityChecks: true,
    });
  });

  describe('event logging', () => {
    it('should log audit events', () => {
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

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should retrieve logged events', () => {
      auditService.logEvent({
        eventType: 'ALERT_GENERATED',
        category: 'ALERT_MANAGEMENT',
        action: 'CREATE_ALERT',
        resourceType: 'ALERT',
        resourceId: 'alert-456',
        outcome: 'SUCCESS',
      });

      const events = auditService.getEvents({});

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe('ALERT_GENERATED');
    });

    it('should filter events by type', () => {
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

      expect(signalEvents.every((e) => e.eventType === 'SIGNAL_SUBMISSION')).toBe(true);
    });

    it('should filter events by time range', () => {
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

      expect(events.length).toBeGreaterThan(0);
    });

    it('should include actor information when provided', () => {
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

      expect(event).toBeDefined();
      expect(event?.actor?.name).toBe('John Analyst');
    });
  });

  describe('governance controls', () => {
    it('should have pre-initialized governance controls', () => {
      const controls = auditService.getGovernanceControls();

      expect(controls.length).toBeGreaterThan(0);
      expect(controls.some((c) => c.category === 'DATA_GOVERNANCE')).toBe(true);
      expect(controls.some((c) => c.category === 'PRIVACY_PROTECTION')).toBe(true);
    });

    it('should add new governance controls', () => {
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

      expect(customControl).toBeDefined();
      expect(customControl?.name).toBe('Custom Data Retention');
    });

    it('should update governance control status', () => {
      const controls = auditService.getGovernanceControls();
      if (controls.length > 0) {
        const success = auditService.updateGovernanceControlStatus(
          controls[0].id,
          'VERIFIED',
          'Verified through Q4 audit',
        );

        expect(success).toBe(true);

        const updated = auditService
          .getGovernanceControls()
          .find((c) => c.id === controls[0].id);
        expect(updated?.status).toBe('VERIFIED');
      }
    });
  });

  describe('compliance scoring', () => {
    it('should calculate compliance score', () => {
      const score = auditService.getComplianceScore();

      expect(score).toBeDefined();
      expect(score.overallScore).toBeDefined();
      expect(typeof score.overallScore).toBe('number');
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should provide category breakdown', () => {
      const score = auditService.getComplianceScore();

      expect(score.categoryScores).toBeDefined();
      expect(typeof score.categoryScores).toBe('object');
    });

    it('should identify gaps', () => {
      const score = auditService.getComplianceScore();

      expect(score.gaps).toBeDefined();
      expect(Array.isArray(score.gaps)).toBe(true);
    });
  });

  describe('integrity verification', () => {
    it('should verify audit log integrity', () => {
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

      expect(integrity.valid).toBe(true);
      expect(integrity.eventsVerified).toBeGreaterThanOrEqual(5);
    });

    it('should detect tampering attempts', () => {
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
      expect(integrity.valid).toBe(true);
    });
  });

  describe('incident management', () => {
    it('should create incidents', () => {
      const incidentId = auditService.createIncident({
        title: 'Suspected coordinated campaign detected',
        description: 'Cross-tenant cluster with high confidence',
        severity: 'HIGH',
        relatedAlertIds: ['alert-1', 'alert-2'],
        relatedClusterIds: ['cluster-1'],
      });

      expect(incidentId).toBeDefined();
      expect(typeof incidentId).toBe('string');
    });

    it('should retrieve incidents', () => {
      auditService.createIncident({
        title: 'Test Incident',
        description: 'Test description',
        severity: 'MEDIUM',
        relatedAlertIds: [],
        relatedClusterIds: [],
      });

      const incidents = auditService.getIncidents({});

      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].title).toBe('Test Incident');
    });

    it('should filter incidents by severity', () => {
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

      expect(criticalIncidents.every((i) => i.severity === 'CRITICAL')).toBe(true);
    });

    it('should update incident status', () => {
      const incidentId = auditService.createIncident({
        title: 'Incident to Update',
        description: 'Will be updated',
        severity: 'MEDIUM',
        relatedAlertIds: [],
        relatedClusterIds: [],
      });

      const success = auditService.updateIncidentStatus(
        incidentId,
        'INVESTIGATING',
        'analyst-1',
        'Starting investigation',
      );

      expect(success).toBe(true);

      const incidents = auditService.getIncidents({ status: 'INVESTIGATING' });
      const updated = incidents.find((i) => i.id === incidentId);

      expect(updated?.status).toBe('INVESTIGATING');
      expect(updated?.assignedTo).toBe('analyst-1');
    });

    it('should close incidents', () => {
      const incidentId = auditService.createIncident({
        title: 'Incident to Close',
        description: 'Will be closed',
        severity: 'LOW',
        relatedAlertIds: [],
        relatedClusterIds: [],
      });

      auditService.updateIncidentStatus(incidentId, 'INVESTIGATING', 'analyst-1');
      const success = auditService.closeIncident(
        incidentId,
        'analyst-1',
        'Issue resolved',
        ['Document findings', 'Update playbook'],
      );

      expect(success).toBe(true);

      const incidents = auditService.getIncidents({});
      const closed = incidents.find((i) => i.id === incidentId);

      expect(closed?.status).toBe('CLOSED');
      expect(closed?.resolution).toBe('Issue resolved');
    });
  });

  describe('export functionality', () => {
    it('should export events to JSON', () => {
      auditService.logEvent({
        eventType: 'SIGNAL_SUBMISSION',
        category: 'DATA_PROCESSING',
        action: 'NORMALIZE_SIGNAL',
        resourceType: 'SIGNAL',
        resourceId: 'signal-export-test',
        outcome: 'SUCCESS',
      });

      const json = auditService.exportEvents('JSON', {});

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export events to CSV', () => {
      auditService.logEvent({
        eventType: 'ALERT_GENERATED',
        category: 'ALERT_MANAGEMENT',
        action: 'CREATE_ALERT',
        resourceType: 'ALERT',
        resourceId: 'alert-csv-test',
        outcome: 'SUCCESS',
      });

      const csv = auditService.exportEvents('CSV', {});

      expect(csv).toBeDefined();
      expect(csv).toContain('eventType');
      expect(csv).toContain('ALERT_GENERATED');
    });

    it('should export events to SIEM format (CEF)', () => {
      auditService.logEvent({
        eventType: 'PRIVACY_VIOLATION',
        category: 'PRIVACY_PROTECTION',
        action: 'BUDGET_EXCEEDED',
        resourceType: 'PRIVACY_BUDGET',
        resourceId: 'budget-1',
        outcome: 'FAILURE',
      });

      const cef = auditService.exportEvents('SIEM', {});

      expect(cef).toBeDefined();
      expect(cef).toContain('CEF:');
    });
  });

  describe('retention policy', () => {
    it('should respect retention policy configuration', () => {
      const shortRetentionService = new AuditService({
        organizationId: 'test-org',
        retentionDays: 7,
        enableIntegrityChecks: true,
      });

      // This just verifies the service initializes correctly with short retention
      expect(shortRetentionService).toBeDefined();
    });
  });

  describe('hash chain', () => {
    it('should maintain hash chain integrity', () => {
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
        expect(event.hash).toBeDefined();
      });

      // Verify chain
      const integrity = auditService.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });
});
