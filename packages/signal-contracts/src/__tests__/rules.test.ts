/**
 * Rules Tests
 */

import {
  createThresholdRule,
  createPatternRule,
  createRateRule,
  createAbsenceRule,
  validateRule,
  ruleAppliesToSignalType,
  sortRulesByPriority,
  SignalTypeId,
  AlertSeverity,
  RuleStatus,
  ComparisonOperator,
  type ThresholdRule,
} from '../index.js';

describe('Rules', () => {
  describe('createThresholdRule', () => {
    it('should create a valid threshold rule', () => {
      const rule = createThresholdRule({
        ruleId: 'rule-001',
        name: 'High CPU Usage',
        description: 'Triggers when CPU usage exceeds 90%',
        version: '1.0.0',
        tenantId: null,
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.TELEMETRY_RESOURCE_USAGE],
        alertSeverity: AlertSeverity.HIGH,
        alertTitleTemplate: 'High CPU: {{actualValue}}%',
        alertDescriptionTemplate: 'CPU usage of {{actualValue}}% exceeded threshold of {{triggerValue}}%',
        config: {
          condition: {
            type: 'simple',
            field: 'payload.cpuUsage',
            operator: ComparisonOperator.GT,
            value: 90,
          },
          thresholdField: 'payload.cpuUsage',
          thresholdValue: 90,
        },
      });

      expect(rule.ruleType).toBe('threshold');
      expect(rule.alertType).toBe('threshold');
      expect(rule.ruleId).toBe('rule-001');
      expect(rule.createdAt).toBeDefined();
      expect(rule.updatedAt).toBeDefined();
    });
  });

  describe('createPatternRule', () => {
    it('should create a valid pattern rule', () => {
      const rule = createPatternRule({
        ruleId: 'rule-002',
        name: 'Login Failure Pattern',
        description: 'Detects multiple failed login attempts',
        version: '1.0.0',
        tenantId: 'tenant-123',
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.LOG_SECURITY],
        alertSeverity: AlertSeverity.CRITICAL,
        alertTitleTemplate: 'Brute Force Attack Detected',
        alertDescriptionTemplate: 'Multiple failed login attempts detected',
        config: {
          sequence: [
            {
              name: 'failed_login',
              condition: {
                type: 'simple',
                field: 'payload.event',
                operator: ComparisonOperator.EQ,
                value: 'login_failed',
              },
              quantifier: { min: 5, max: 10 },
            },
          ],
          withinMs: 60000,
          ordered: true,
          correlationField: 'payload.userId',
        },
      });

      expect(rule.ruleType).toBe('pattern');
      expect(rule.alertType).toBe('pattern');
      expect(rule.config.sequence).toHaveLength(1);
      expect(rule.config.withinMs).toBe(60000);
    });
  });

  describe('createRateRule', () => {
    it('should create a valid rate rule', () => {
      const rule = createRateRule({
        ruleId: 'rule-003',
        name: 'High Request Rate',
        description: 'Detects unusually high request rates',
        version: '1.0.0',
        tenantId: null,
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.LOG_ACCESS],
        alertSeverity: AlertSeverity.MEDIUM,
        alertTitleTemplate: 'High Request Rate',
        alertDescriptionTemplate: 'Request rate exceeded threshold',
        config: {
          condition: {
            type: 'simple',
            field: 'metadata.signalType',
            operator: ComparisonOperator.EXISTS,
            value: true,
          },
          rateThreshold: 1000,
          windowMs: 60000,
          triggerOnHigh: true,
          groupBy: 'payload.clientIp',
        },
      });

      expect(rule.ruleType).toBe('rate');
      expect(rule.alertType).toBe('rate');
      expect(rule.config.rateThreshold).toBe(1000);
    });
  });

  describe('createAbsenceRule', () => {
    it('should create a valid absence rule', () => {
      const rule = createAbsenceRule({
        ruleId: 'rule-004',
        name: 'Missing Heartbeat',
        description: 'Detects devices that stopped sending heartbeats',
        version: '1.0.0',
        tenantId: null,
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.TELEMETRY_HEARTBEAT],
        alertSeverity: AlertSeverity.HIGH,
        alertTitleTemplate: 'Device Offline',
        alertDescriptionTemplate: 'No heartbeat received from device',
        config: {
          maxGapMs: 300000,
          monitorField: 'device.deviceId',
          monitoredValues: [],
          gracePeriodMs: 60000,
        },
      });

      expect(rule.ruleType).toBe('absence');
      expect(rule.alertType).toBe('absence');
      expect(rule.config.maxGapMs).toBe(300000);
    });
  });

  describe('validateRule', () => {
    it('should validate a correct rule', () => {
      const rule = createThresholdRule({
        ruleId: 'rule-001',
        name: 'Test Rule',
        description: 'Test description',
        version: '1.0.0',
        tenantId: null,
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.TELEMETRY_RESOURCE_USAGE],
        alertSeverity: AlertSeverity.LOW,
        alertTitleTemplate: 'Test',
        alertDescriptionTemplate: 'Test',
        config: {
          condition: {
            type: 'simple',
            field: 'test',
            operator: ComparisonOperator.EXISTS,
            value: true,
          },
        },
      });

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should reject an invalid rule', () => {
      const invalidRule = {
        ruleId: 'test',
        ruleType: 'invalid',
      };

      const result = validateRule(invalidRule);
      expect(result.success).toBe(false);
    });
  });

  describe('ruleAppliesToSignalType', () => {
    it('should return true for matching signal type', () => {
      const rule = createThresholdRule({
        ruleId: 'rule-001',
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        tenantId: null,
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.SENSOR_GEOLOCATION, SignalTypeId.SENSOR_MOTION],
        alertSeverity: AlertSeverity.LOW,
        alertTitleTemplate: 'Test',
        alertDescriptionTemplate: 'Test',
        config: {
          condition: {
            type: 'simple',
            field: 'test',
            operator: ComparisonOperator.EXISTS,
            value: true,
          },
        },
      });

      expect(ruleAppliesToSignalType(rule, SignalTypeId.SENSOR_GEOLOCATION)).toBe(true);
      expect(ruleAppliesToSignalType(rule, SignalTypeId.SENSOR_MOTION)).toBe(true);
      expect(ruleAppliesToSignalType(rule, SignalTypeId.LOG_SECURITY)).toBe(false);
    });
  });

  describe('sortRulesByPriority', () => {
    it('should sort rules by priority descending', () => {
      const lowPriority = createThresholdRule({
        ruleId: 'low',
        name: 'Low',
        description: 'Low priority',
        version: '1.0.0',
        tenantId: null,
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.SENSOR_GEOLOCATION],
        alertSeverity: AlertSeverity.LOW,
        alertTitleTemplate: 'Test',
        alertDescriptionTemplate: 'Test',
        priority: 10,
        config: {
          condition: {
            type: 'simple',
            field: 'test',
            operator: ComparisonOperator.EXISTS,
            value: true,
          },
        },
      });

      const highPriority = createThresholdRule({
        ruleId: 'high',
        name: 'High',
        description: 'High priority',
        version: '1.0.0',
        tenantId: null,
        status: RuleStatus.ACTIVE,
        signalTypes: [SignalTypeId.SENSOR_GEOLOCATION],
        alertSeverity: AlertSeverity.HIGH,
        alertTitleTemplate: 'Test',
        alertDescriptionTemplate: 'Test',
        priority: 90,
        config: {
          condition: {
            type: 'simple',
            field: 'test',
            operator: ComparisonOperator.EXISTS,
            value: true,
          },
        },
      });

      const sorted = sortRulesByPriority([lowPriority, highPriority]);

      expect(sorted[0].ruleId).toBe('high');
      expect(sorted[1].ruleId).toBe('low');
    });
  });
});
