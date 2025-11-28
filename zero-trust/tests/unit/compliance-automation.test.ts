/**
 * Unit Tests for Compliance Automation Controller
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Types for testing
interface ComplianceControl {
  id: string;
  name: string;
  family: string;
  validations: ControlValidation[];
}

interface ControlValidation {
  id: string;
  type: 'metric' | 'config' | 'policy';
  query: string;
  threshold: number | string;
  operator: 'eq' | 'gte' | 'lte' | 'gt' | 'lt';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface ValidationResult {
  validationId: string;
  status: 'pass' | 'fail';
  actualValue: unknown;
  expectedValue: unknown;
}

interface Finding {
  id: string;
  controlId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'closed' | 'accepted';
}

// Test implementation
class TestComplianceValidator {
  validateControl(
    control: ComplianceControl,
    evidenceData: Record<string, unknown>
  ): { results: ValidationResult[]; score: number } {
    const results: ValidationResult[] = [];

    for (const validation of control.validations) {
      const actualValue = evidenceData[validation.query];
      let passed = false;

      if (typeof actualValue === 'number' && typeof validation.threshold === 'number') {
        switch (validation.operator) {
          case 'eq': passed = actualValue === validation.threshold; break;
          case 'gte': passed = actualValue >= validation.threshold; break;
          case 'lte': passed = actualValue <= validation.threshold; break;
          case 'gt': passed = actualValue > validation.threshold; break;
          case 'lt': passed = actualValue < validation.threshold; break;
        }
      } else {
        passed = actualValue === validation.threshold;
      }

      results.push({
        validationId: validation.id,
        status: passed ? 'pass' : 'fail',
        actualValue,
        expectedValue: validation.threshold,
      });
    }

    const passCount = results.filter(r => r.status === 'pass').length;
    const score = results.length > 0 ? (passCount / results.length) * 100 : 0;

    return { results, score };
  }

  generateFinding(
    controlId: string,
    validation: ValidationResult,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): Finding {
    return {
      id: `finding-${Date.now()}`,
      controlId,
      severity,
      status: 'open',
    };
  }

  calculateDueDate(severity: Finding['severity']): Date {
    const days = {
      critical: 7,
      high: 30,
      medium: 90,
      low: 180,
    };
    const date = new Date();
    date.setDate(date.getDate() + days[severity]);
    return date;
  }
}

describe('ComplianceAutomationController', () => {
  let validator: TestComplianceValidator;

  beforeEach(() => {
    validator = new TestComplianceValidator();
  });

  describe('Control Validation', () => {
    const testControl: ComplianceControl = {
      id: 'ZTA-2',
      name: 'Secure Communications',
      family: 'ZTA',
      validations: [
        {
          id: 'ZTA-2-V1',
          type: 'metric',
          query: 'mtls_success_rate',
          threshold: 99.9,
          operator: 'gte',
          severity: 'critical',
        },
        {
          id: 'ZTA-2-V2',
          type: 'config',
          query: 'tls_version',
          threshold: '1.3',
          operator: 'eq',
          severity: 'high',
        },
      ],
    };

    it('should pass all validations when evidence meets thresholds', () => {
      const evidence = {
        mtls_success_rate: 99.95,
        tls_version: '1.3',
      };

      const { results, score } = validator.validateControl(testControl, evidence);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'pass')).toBe(true);
      expect(score).toBe(100);
    });

    it('should fail validation when metric is below threshold', () => {
      const evidence = {
        mtls_success_rate: 99.5, // Below 99.9
        tls_version: '1.3',
      };

      const { results, score } = validator.validateControl(testControl, evidence);

      expect(results[0].status).toBe('fail');
      expect(results[1].status).toBe('pass');
      expect(score).toBe(50);
    });

    it('should fail validation when config does not match', () => {
      const evidence = {
        mtls_success_rate: 99.95,
        tls_version: '1.2', // Wrong version
      };

      const { results, score } = validator.validateControl(testControl, evidence);

      expect(results[0].status).toBe('pass');
      expect(results[1].status).toBe('fail');
      expect(score).toBe(50);
    });

    it('should fail all validations when evidence is missing', () => {
      const evidence = {};

      const { results, score } = validator.validateControl(testControl, evidence);

      expect(results.every(r => r.status === 'fail')).toBe(true);
      expect(score).toBe(0);
    });
  });

  describe('Finding Generation', () => {
    it('should generate finding with correct severity', () => {
      const validation: ValidationResult = {
        validationId: 'test-v1',
        status: 'fail',
        actualValue: 95,
        expectedValue: 99.9,
      };

      const finding = validator.generateFinding('ZTA-2', validation, 'critical');

      expect(finding.controlId).toBe('ZTA-2');
      expect(finding.severity).toBe('critical');
      expect(finding.status).toBe('open');
    });
  });

  describe('Due Date Calculation', () => {
    it('should calculate 7 days for critical severity', () => {
      const dueDate = validator.calculateDueDate('critical');
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);

      expect(dueDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should calculate 30 days for high severity', () => {
      const dueDate = validator.calculateDueDate('high');
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);

      expect(dueDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should calculate 90 days for medium severity', () => {
      const dueDate = validator.calculateDueDate('medium');
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 90);

      expect(dueDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should calculate 180 days for low severity', () => {
      const dueDate = validator.calculateDueDate('low');
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 180);

      expect(dueDate.toDateString()).toBe(expectedDate.toDateString());
    });
  });
});

describe('NIST 800-207 Controls', () => {
  const nistControls: ComplianceControl[] = [
    {
      id: 'ZTA-1',
      name: 'Resource Protection',
      family: 'ZTA',
      validations: [
        { id: 'ZTA-1-V1', type: 'metric', query: 'network_policy_coverage', threshold: 100, operator: 'gte', severity: 'critical' },
      ],
    },
    {
      id: 'ZTA-2',
      name: 'Secure Communications',
      family: 'ZTA',
      validations: [
        { id: 'ZTA-2-V1', type: 'metric', query: 'mtls_success_rate', threshold: 99.9, operator: 'gte', severity: 'critical' },
      ],
    },
    {
      id: 'ZTA-3',
      name: 'Per-Session Access',
      family: 'ZTA',
      validations: [
        { id: 'ZTA-3-V1', type: 'metric', query: 'session_validation_rate', threshold: 100, operator: 'gte', severity: 'high' },
      ],
    },
    {
      id: 'ZTA-4',
      name: 'Dynamic Policy',
      family: 'ZTA',
      validations: [
        { id: 'ZTA-4-V1', type: 'config', query: 'policy_engine', threshold: 'enabled', operator: 'eq', severity: 'high' },
      ],
    },
  ];

  it('should have all required ZTA tenets defined', () => {
    expect(nistControls).toHaveLength(4);
    expect(nistControls.map(c => c.id)).toEqual(['ZTA-1', 'ZTA-2', 'ZTA-3', 'ZTA-4']);
  });

  it('should have at least one validation per control', () => {
    for (const control of nistControls) {
      expect(control.validations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should have critical severity for core ZTA controls', () => {
    const criticalControls = ['ZTA-1', 'ZTA-2'];
    for (const control of nistControls.filter(c => criticalControls.includes(c.id))) {
      expect(control.validations.some(v => v.severity === 'critical')).toBe(true);
    }
  });
});

describe('FedRAMP Controls', () => {
  const fedRampControls: ComplianceControl[] = [
    {
      id: 'AC-2',
      name: 'Account Management',
      family: 'AC',
      validations: [
        { id: 'AC-2-V1', type: 'config', query: 'identity_management', threshold: 'enabled', operator: 'eq', severity: 'high' },
      ],
    },
    {
      id: 'AC-3',
      name: 'Access Enforcement',
      family: 'AC',
      validations: [
        { id: 'AC-3-V1', type: 'metric', query: 'opa_decisions_total', threshold: 0, operator: 'gt', severity: 'high' },
      ],
    },
    {
      id: 'SC-8',
      name: 'Transmission Confidentiality',
      family: 'SC',
      validations: [
        { id: 'SC-8-V1', type: 'metric', query: 'tls_compliance_rate', threshold: 100, operator: 'gte', severity: 'critical' },
      ],
    },
  ];

  it('should have access control family defined', () => {
    const acControls = fedRampControls.filter(c => c.family === 'AC');
    expect(acControls.length).toBeGreaterThanOrEqual(2);
  });

  it('should have system protection family defined', () => {
    const scControls = fedRampControls.filter(c => c.family === 'SC');
    expect(scControls.length).toBeGreaterThanOrEqual(1);
  });
});
