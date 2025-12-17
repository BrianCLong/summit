/**
 * Alert Tests
 */

import {
  createAlert,
  createAlertFromSignal,
  validateAlert,
  shouldSuppressAlert,
  calculateAlertPriority,
  createSignalEnvelope,
  AlertSeverity,
  AlertStatus,
  AlertType,
  SignalTypeId,
  type CreateAlertInput,
  type Alert,
  type RawSignalInput,
} from '../index.js';

describe('Alert', () => {
  const validAlertInput: CreateAlertInput = {
    alertType: AlertType.THRESHOLD,
    severity: AlertSeverity.HIGH,
    tenantId: 'tenant-123',
    title: 'High CPU Usage Detected',
    description: 'CPU usage exceeded 90% threshold',
    triggeringRule: {
      ruleId: 'rule-001',
      ruleName: 'CPU Threshold Rule',
      ruleVersion: '1.0.0',
      matchedCondition: 'cpu_usage > 90',
      triggerValue: 90,
      actualValue: 95,
    },
    signalReferences: [
      {
        signalId: '123e4567-e89b-12d3-a456-426614174000',
        signalType: SignalTypeId.TELEMETRY_RESOURCE_USAGE,
        timestamp: Date.now(),
        relevance: 1,
      },
    ],
  };

  describe('createAlert', () => {
    it('should create a valid alert', () => {
      const alert = createAlert(validAlertInput);

      expect(alert.alertId).toBeDefined();
      expect(alert.alertType).toBe(AlertType.THRESHOLD);
      expect(alert.severity).toBe(AlertSeverity.HIGH);
      expect(alert.status).toBe(AlertStatus.NEW);
      expect(alert.tenantId).toBe('tenant-123');
      expect(alert.title).toBe('High CPU Usage Detected');
      expect(alert.triggeringRule.ruleId).toBe('rule-001');
      expect(alert.signalReferences).toHaveLength(1);
      expect(alert.createdAt).toBeDefined();
      expect(alert.updatedAt).toBeDefined();
    });

    it('should set default values for optional fields', () => {
      const alert = createAlert(validAlertInput);

      expect(alert.context.relatedEntities).toEqual([]);
      expect(alert.context.relatedAlerts).toEqual([]);
      expect(alert.recommendedActions).toEqual([]);
      expect(alert.policyLabels).toEqual([]);
      expect(alert.tags).toEqual([]);
      expect(alert.schemaVersion).toBe('1.0.0');
    });
  });

  describe('createAlertFromSignal', () => {
    it('should create an alert from a signal envelope', () => {
      const rawInput: RawSignalInput = {
        signalType: SignalTypeId.TELEMETRY_RESOURCE_USAGE,
        tenantId: 'tenant-123',
        sourceId: 'server-001',
        sourceType: 'device',
        payload: { cpuUsage: 95 },
      };

      const envelope = createSignalEnvelope(rawInput);

      const alert = createAlertFromSignal(envelope, {
        ruleId: 'rule-001',
        ruleName: 'CPU Threshold',
        ruleVersion: '1.0.0',
        condition: 'cpu > 90',
        alertType: AlertType.THRESHOLD,
        severity: AlertSeverity.HIGH,
        title: 'High CPU',
        description: 'CPU exceeded threshold',
        triggerValue: 90,
        actualValue: 95,
        confidence: 1.0,
      });

      expect(alert.alertId).toBeDefined();
      expect(alert.tenantId).toBe('tenant-123');
      expect(alert.signalReferences).toHaveLength(1);
      expect(alert.signalReferences[0].signalId).toBe(envelope.metadata.signalId);
      expect(alert.triggeringRule.confidence).toBe(1.0);
    });

    it('should include location from signal if available', () => {
      const rawInput: RawSignalInput = {
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        tenantId: 'tenant-123',
        sourceId: 'device-001',
        sourceType: 'device',
        payload: {},
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      const envelope = createSignalEnvelope(rawInput);

      const alert = createAlertFromSignal(envelope, {
        ruleId: 'rule-001',
        ruleName: 'Geofence Alert',
        ruleVersion: '1.0.0',
        condition: 'outside_geofence',
        alertType: AlertType.PATTERN,
        severity: AlertSeverity.MEDIUM,
        title: 'Geofence Breach',
        description: 'Device left designated area',
      });

      expect(alert.context.location).toBeDefined();
      expect(alert.context.location?.latitude).toBe(37.7749);
      expect(alert.context.location?.longitude).toBe(-122.4194);
    });
  });

  describe('validateAlert', () => {
    it('should validate a correct alert', () => {
      const alert = createAlert(validAlertInput);
      const result = validateAlert(alert);

      expect(result.success).toBe(true);
    });

    it('should reject an invalid alert', () => {
      const invalidAlert = {
        alertId: 'not-a-uuid',
        alertType: 'invalid-type',
      };

      const result = validateAlert(invalidAlert);

      expect(result.success).toBe(false);
    });
  });

  describe('shouldSuppressAlert', () => {
    it('should suppress duplicate alerts within window', () => {
      const alert1 = createAlert(validAlertInput);
      const alert2 = createAlert(validAlertInput);

      const shouldSuppress = shouldSuppressAlert(alert2, [alert1], 300000);

      expect(shouldSuppress).toBe(true);
    });

    it('should not suppress alerts from different rules', () => {
      const alert1 = createAlert(validAlertInput);
      const alert2 = createAlert({
        ...validAlertInput,
        triggeringRule: {
          ...validAlertInput.triggeringRule,
          ruleId: 'rule-002',
        },
      });

      const shouldSuppress = shouldSuppressAlert(alert2, [alert1], 300000);

      expect(shouldSuppress).toBe(false);
    });

    it('should not suppress if window has passed', () => {
      const alert1 = createAlert(validAlertInput);
      // Simulate old alert
      (alert1 as any).createdAt = Date.now() - 400000;

      const alert2 = createAlert(validAlertInput);

      const shouldSuppress = shouldSuppressAlert(alert2, [alert1], 300000);

      expect(shouldSuppress).toBe(false);
    });

    it('should not suppress if existing alert is resolved', () => {
      const alert1 = createAlert(validAlertInput);
      alert1.status = AlertStatus.RESOLVED;

      const alert2 = createAlert(validAlertInput);

      const shouldSuppress = shouldSuppressAlert(alert2, [alert1], 300000);

      expect(shouldSuppress).toBe(false);
    });
  });

  describe('calculateAlertPriority', () => {
    it('should calculate higher priority for critical severity', () => {
      const criticalAlert = createAlert({
        ...validAlertInput,
        severity: AlertSeverity.CRITICAL,
      });

      const lowAlert = createAlert({
        ...validAlertInput,
        severity: AlertSeverity.LOW,
      });

      const criticalPriority = calculateAlertPriority(criticalAlert);
      const lowPriority = calculateAlertPriority(lowAlert);

      expect(criticalPriority).toBeGreaterThan(lowPriority);
    });

    it('should factor in alert type multipliers', () => {
      const correlationAlert = createAlert({
        ...validAlertInput,
        alertType: AlertType.CORRELATION,
      });

      const thresholdAlert = createAlert({
        ...validAlertInput,
        alertType: AlertType.THRESHOLD,
      });

      const correlationPriority = calculateAlertPriority(correlationAlert);
      const thresholdPriority = calculateAlertPriority(thresholdAlert);

      expect(correlationPriority).toBeGreaterThan(thresholdPriority);
    });

    it('should increase priority with more signal references', () => {
      const singleSignalAlert = createAlert(validAlertInput);

      const multiSignalAlert = createAlert({
        ...validAlertInput,
        signalReferences: [
          ...validAlertInput.signalReferences,
          {
            signalId: '223e4567-e89b-12d3-a456-426614174001',
            signalType: SignalTypeId.TELEMETRY_RESOURCE_USAGE,
            timestamp: Date.now(),
            relevance: 0.8,
          },
          {
            signalId: '323e4567-e89b-12d3-a456-426614174002',
            signalType: SignalTypeId.TELEMETRY_RESOURCE_USAGE,
            timestamp: Date.now(),
            relevance: 0.6,
          },
        ],
      });

      const singlePriority = calculateAlertPriority(singleSignalAlert);
      const multiPriority = calculateAlertPriority(multiSignalAlert);

      expect(multiPriority).toBeGreaterThan(singlePriority);
    });
  });
});
