const test = require('node:test');
const assert = require('node:assert');
const { ComplianceEngine, COMPLIANCE_STANDARDS } = require('../src/complianceEngine');

test('ComplianceEngine has built-in standards', () => {
  const engine = new ComplianceEngine();
  const standards = engine.listStandards();

  assert.ok(standards.length > 0);
  assert.ok(standards.find((s) => s.id === 'GDPR'));
  assert.ok(standards.find((s) => s.id === 'CCPA'));
  assert.ok(standards.find((s) => s.id === 'HIPAA'));
  assert.ok(standards.find((s) => s.id === 'SOC2'));
  assert.ok(standards.find((s) => s.id === 'DATA-RESIDENCY'));
  assert.ok(standards.find((s) => s.id === 'PII-PROTECTION'));
});

test('ComplianceEngine assesses data residency requirements', () => {
  const engine = new ComplianceEngine();

  const compliantContract = {
    title: 'Customer Profile',
    'x-data-spine': {
      contract: 'customer-profile',
      version: '1.0.0',
      classification: ['Internal'],
      residency: {
        allowedRegions: ['us-east-1', 'us-west-2'],
        defaultRegion: 'us-east-1',
      },
      policies: {
        fieldPolicies: [{ field: 'id', action: 'pass' }],
      },
    },
  };

  const result = engine.assessContract(compliantContract, ['DATA-RESIDENCY']);
  assert.ok(result.overallCompliant);
  assert.strictEqual(result.violations.length, 0);
});

test('ComplianceEngine detects residency violations', () => {
  const engine = new ComplianceEngine();

  const nonCompliantContract = {
    title: 'Bad Contract',
    'x-data-spine': {
      contract: 'bad-contract',
      version: '1.0.0',
      classification: ['Internal'],
      residency: {
        allowedRegions: ['us-east-1'],
        defaultRegion: 'eu-west-1', // Not in allowed list
      },
      policies: {
        fieldPolicies: [{ field: 'id', action: 'pass' }],
      },
    },
  };

  const result = engine.assessContract(nonCompliantContract, ['DATA-RESIDENCY']);
  assert.ok(!result.overallCompliant);
  assert.ok(result.violations.length > 0);
});

test('ComplianceEngine assesses PII protection', () => {
  const engine = new ComplianceEngine();

  const piiContract = {
    title: 'PII Contract',
    'x-data-spine': {
      contract: 'pii-contract',
      version: '1.0.0',
      classification: ['PII'],
      residency: {
        allowedRegions: ['us-east-1'],
        defaultRegion: 'us-east-1',
      },
      policies: {
        lowerEnvironmentHandling: 'tokenize',
        fieldPolicies: [
          { field: 'email', action: 'tokenize' },
          { field: 'ssn', action: 'redact' },
        ],
        transformations: {
          deterministic: true,
          reversible: true,
        },
      },
    },
  };

  const result = engine.assessContract(piiContract, ['PII-PROTECTION']);
  assert.ok(result.overallCompliant);
});

test('ComplianceEngine detects PII protection violations', () => {
  const engine = new ComplianceEngine();

  const unprotectedPiiContract = {
    title: 'Unprotected PII',
    'x-data-spine': {
      contract: 'unprotected-pii',
      version: '1.0.0',
      classification: ['PII'],
      residency: {
        allowedRegions: ['us-east-1'],
        defaultRegion: 'us-east-1',
      },
      policies: {
        lowerEnvironmentHandling: 'allow', // Should be tokenize or redact
        fieldPolicies: [{ field: 'email', action: 'tokenize' }],
        transformations: {
          deterministic: false, // Should be true
          reversible: false, // Should be true
        },
      },
    },
  };

  const result = engine.assessContract(unprotectedPiiContract, ['PII-PROTECTION']);
  assert.ok(!result.overallCompliant);
  assert.ok(result.violations.length > 0);
});

test('ComplianceEngine auto-selects applicable standards', () => {
  const engine = new ComplianceEngine();

  const piiContract = {
    title: 'Auto-select Test',
    'x-data-spine': {
      contract: 'auto-test',
      version: '1.0.0',
      classification: ['PII', 'Internal'],
      residency: {
        allowedRegions: ['us-east-1'],
        defaultRegion: 'us-east-1',
      },
      policies: {
        lowerEnvironmentHandling: 'tokenize',
        fieldPolicies: [{ field: 'id', action: 'pass' }],
        transformations: { deterministic: true, reversible: true },
      },
    },
  };

  // Let engine auto-select standards
  const result = engine.assessContract(piiContract);

  // Should include data residency, PII protection, GDPR, CCPA, SOC2
  const standardIds = result.standards.map((s) => s.standardId);
  assert.ok(standardIds.includes('DATA-RESIDENCY'));
  assert.ok(standardIds.includes('PII-PROTECTION'));
});

test('ComplianceEngine generates compliance reports', () => {
  const engine = new ComplianceEngine();

  const contract1 = {
    title: 'Contract 1',
    'x-data-spine': {
      contract: 'contract-1',
      version: '1.0.0',
      classification: ['Internal'],
      residency: { allowedRegions: ['us-east-1'], defaultRegion: 'us-east-1' },
      policies: { fieldPolicies: [{ field: 'id', action: 'pass' }] },
    },
  };

  const contract2 = {
    title: 'Contract 2',
    'x-data-spine': {
      contract: 'contract-2',
      version: '1.0.0',
      classification: ['Internal'],
      residency: { allowedRegions: ['us-east-1'], defaultRegion: 'eu-west-1' },
      policies: { fieldPolicies: [{ field: 'id', action: 'pass' }] },
    },
  };

  engine.assessContract(contract1, ['DATA-RESIDENCY']);
  engine.assessContract(contract2, ['DATA-RESIDENCY']);

  const report = engine.generateComplianceReport();

  assert.ok(report.reportId);
  assert.strictEqual(report.summary.totalAssessments, 2);
  assert.ok(report.summary.openViolations > 0);
  assert.ok(report.byStandard['DATA-RESIDENCY']);
});

test('ComplianceEngine tracks and resolves violations', () => {
  const engine = new ComplianceEngine();

  const badContract = {
    title: 'Bad Contract',
    'x-data-spine': {
      contract: 'bad',
      version: '1.0.0',
      classification: ['Internal'],
      residency: { allowedRegions: [], defaultRegion: null },
      policies: { fieldPolicies: [] },
    },
  };

  const assessment = engine.assessContract(badContract, ['DATA-RESIDENCY']);
  assert.ok(assessment.violations.length > 0);

  const violation = assessment.violations[0];
  const openViolations = engine.listViolations({ resolved: false });
  assert.ok(openViolations.find((v) => v.id === violation.id));

  engine.resolveViolation(violation.id, {
    action: 'Fixed residency configuration',
    resolvedBy: 'admin',
  });

  const resolved = engine.getViolation(violation.id);
  assert.strictEqual(resolved.resolved, true);
  assert.ok(resolved.resolvedAt);
});

test('ComplianceEngine registers custom standards', () => {
  const engine = new ComplianceEngine();

  engine.registerStandard({
    id: 'CUSTOM-STANDARD',
    name: 'Custom Compliance Standard',
    version: '1.0',
    jurisdiction: 'Enterprise',
    requirements: [
      {
        id: 'custom-req-1',
        description: 'Must have version',
        category: 'documentation',
        mandatory: true,
        check: (contract) => contract['x-data-spine']?.version != null,
      },
    ],
  });

  const standard = engine.getStandard('CUSTOM-STANDARD');
  assert.ok(standard);
  assert.strictEqual(standard.requirements.length, 1);

  const contract = {
    'x-data-spine': {
      version: '1.0.0',
      residency: { allowedRegions: ['us-east-1'], defaultRegion: 'us-east-1' },
      policies: { fieldPolicies: [{ field: 'id', action: 'pass' }] },
    },
  };

  const result = engine.assessContract(contract, ['CUSTOM-STANDARD']);
  assert.ok(result.overallCompliant);
});

test('ComplianceEngine calculates overall score', () => {
  const engine = new ComplianceEngine();

  const partialCompliant = {
    title: 'Partial',
    'x-data-spine': {
      contract: 'partial',
      version: '1.0.0',
      classification: ['Internal'],
      residency: {
        allowedRegions: ['us-east-1'],
        defaultRegion: 'us-east-1',
      },
      policies: {
        fieldPolicies: [{ field: 'id', action: 'pass' }],
      },
    },
  };

  const result = engine.assessContract(partialCompliant, ['DATA-RESIDENCY']);

  assert.ok(typeof result.overallScore === 'number');
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
});
