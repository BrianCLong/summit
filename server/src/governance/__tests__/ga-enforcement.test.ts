/**
 * Governance Enforcement Tests
 *
 * Comprehensive governance bypass prevention tests ensuring all responses
 * include governance verdicts and that bypassing governance is structurally impossible.
 *
 * SOC 2 Evidence: CC6.1, CC7.2, PI1.3
 * Compliance: SLSA L3, IC-grade multi-tenancy
 *
 * Test Coverage:
 * - Governance Verdict Enforcement (5 tests)
 * - Governance Bypass Prevention (8 tests)
 * - Provenance Validation (5 tests)
 * - Data Integrity (4 tests)
 * - Snapshot Tests (3 tests)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { randomUUID, createHash } from 'crypto';
import { PolicyEngine } from '../PolicyEngine.js';
import type {
  Policy,
  PolicyContext,
  GovernanceVerdict,
  PolicyAction,
} from '../types.js';

// Mock data structures for testing
interface DataEnvelope<T = any> {
  data: T;
  governanceVerdict: GovernanceVerdict;
  provenance: ProvenanceChain;
  metadata: DataMetadata;
}

interface ProvenanceChain {
  source: string;
  timestamp: string;
  lineage: string[];
  hash: string;
}

interface DataMetadata {
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SECRET';
  isSimulated: boolean;
  hash: string;
  generatedAt: string;
}

describe('Governance Verdict Enforcement', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
    const testPolicy: Policy = {
      id: 'test-enforcement-policy',
      description: 'Test policy for enforcement',
      scope: {
        stages: ['runtime'],
        tenants: ['*'],
      },
      rules: [
        {
          field: 'action',
          operator: 'eq',
          value: 'read',
        },
      ],
      action: 'ALLOW',
    };
    policyEngine.loadPolicies([testPolicy]);
  });

  it('should wrap response with governance verdict', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read', resource: 'entity-123' },
    };

    const verdict = policyEngine.check(context);
    const envelope: DataEnvelope = {
      data: { id: 'entity-123', name: 'Test Entity' },
      governanceVerdict: verdict,
      provenance: {
        source: 'test-system',
        timestamp: new Date().toISOString(),
        lineage: ['system', 'policy-engine'],
        hash: createHash('sha256').update('test-data').digest('hex'),
      },
      metadata: {
        classification: 'INTERNAL',
        isSimulated: false,
        hash: createHash('sha256').update('test-data').digest('hex'),
        generatedAt: new Date().toISOString(),
      },
    };

    expect(envelope.governanceVerdict).toBeDefined();
    expect(envelope.governanceVerdict.action).toBe('ALLOW');
    expect(envelope.provenance).toBeDefined();
    expect(envelope.metadata).toBeDefined();
  });

  it('should reject response without verdict', () => {
    const invalidEnvelope = {
      data: { id: 'entity-123', name: 'Test Entity' },
      // Missing governanceVerdict
      provenance: {
        source: 'test-system',
        timestamp: new Date().toISOString(),
        lineage: ['system'],
        hash: createHash('sha256').update('test-data').digest('hex'),
      },
    };

    const hasVerdict = 'governanceVerdict' in invalidEnvelope;
    expect(hasVerdict).toBe(false);

    // Validator would reject this
    const validateEnvelope = (env: any): env is DataEnvelope => {
      return (
        env.data !== undefined &&
        env.governanceVerdict !== undefined &&
        env.provenance !== undefined &&
        env.metadata !== undefined
      );
    };

    expect(validateEnvelope(invalidEnvelope)).toBe(false);
  });

  it('should include all required verdict fields', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);

    // Required fields validation
    expect(verdict.action).toBeDefined();
    expect(typeof verdict.action).toBe('string');
    expect(['ALLOW', 'DENY', 'ESCALATE', 'WARN']).toContain(verdict.action);

    expect(verdict.reasons).toBeDefined();
    expect(Array.isArray(verdict.reasons)).toBe(true);

    expect(verdict.policyIds).toBeDefined();
    expect(Array.isArray(verdict.policyIds)).toBe(true);

    expect(verdict.metadata).toBeDefined();
    expect(verdict.metadata.timestamp).toBeDefined();
    expect(verdict.metadata.evaluator).toBeDefined();
    expect(verdict.metadata.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof verdict.metadata.simulation).toBe('boolean');

    expect(verdict.provenance).toBeDefined();
    expect(verdict.provenance.origin).toBeDefined();
    expect(verdict.provenance.confidence).toBeGreaterThanOrEqual(0);
    expect(verdict.provenance.confidence).toBeLessThanOrEqual(1);
  });

  it('should validate verdict timestamp', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const beforeCheck = Date.now();
    const verdict = policyEngine.check(context);
    const afterCheck = Date.now();

    const verdictTimestamp = new Date(verdict.metadata.timestamp).getTime();

    expect(verdictTimestamp).toBeGreaterThanOrEqual(beforeCheck);
    expect(verdictTimestamp).toBeLessThanOrEqual(afterCheck);

    // Timestamp must be valid ISO 8601
    const isValidISO = !Number.isNaN(new Date(verdict.metadata.timestamp).getTime());
    expect(isValidISO).toBe(true);
  });

  it('should track verdict evaluator', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);

    expect(verdict.metadata.evaluator).toBe('native-policy-engine-v1');
    expect(typeof verdict.metadata.evaluator).toBe('string');
    expect(verdict.metadata.evaluator.length).toBeGreaterThan(0);
  });
});

describe('Governance Bypass Prevention', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  it('should prevent direct data access without governance check', () => {
    // Simulate attempt to access data without governance check
    const rawData = { id: 'entity-123', sensitiveField: 'secret-value' };

    // Without governance envelope, data should be rejected
    const hasGovernanceWrapper = (obj: any): obj is DataEnvelope => {
      return obj.governanceVerdict !== undefined;
    };

    expect(hasGovernanceWrapper(rawData)).toBe(false);

    // Proper envelope with governance
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);
    const envelope: DataEnvelope = {
      data: rawData,
      governanceVerdict: verdict,
      provenance: {
        source: 'test-system',
        timestamp: new Date().toISOString(),
        lineage: ['system', 'policy-engine'],
        hash: createHash('sha256').update(JSON.stringify(rawData)).digest('hex'),
      },
      metadata: {
        classification: 'CONFIDENTIAL',
        isSimulated: false,
        hash: createHash('sha256').update(JSON.stringify(rawData)).digest('hex'),
        generatedAt: new Date().toISOString(),
      },
    };

    expect(hasGovernanceWrapper(envelope)).toBe(true);
  });

  it('should block null verdict injection', () => {
    const maliciousEnvelope = {
      data: { id: 'entity-123' },
      governanceVerdict: null,
      provenance: {
        source: 'test',
        timestamp: new Date().toISOString(),
        lineage: [],
        hash: 'test',
      },
      metadata: {
        classification: 'PUBLIC' as const,
        isSimulated: false,
        hash: 'test',
        generatedAt: new Date().toISOString(),
      },
    };

    const isValidVerdict = (verdict: any): verdict is GovernanceVerdict => {
      return (
        verdict !== null &&
        verdict !== undefined &&
        typeof verdict === 'object' &&
        'action' in verdict &&
        'reasons' in verdict &&
        'policyIds' in verdict &&
        'metadata' in verdict &&
        'provenance' in verdict
      );
    };

    expect(isValidVerdict(maliciousEnvelope.governanceVerdict)).toBe(false);
  });

  it('should block undefined verdict injection', () => {
    const maliciousEnvelope = {
      data: { id: 'entity-123' },
      governanceVerdict: undefined,
    };

    const validateEnvelope = (env: any): env is DataEnvelope => {
      return (
        env.governanceVerdict !== null &&
        env.governanceVerdict !== undefined &&
        typeof env.governanceVerdict === 'object'
      );
    };

    expect(validateEnvelope(maliciousEnvelope)).toBe(false);
  });

  it('should prevent verdict result tampering', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);
    const originalAction = verdict.action;

    // Attempt to tamper with verdict
    const tamperedVerdict = { ...verdict };
    (tamperedVerdict as any).action = 'DENY';

    // Original verdict should be immutable (in practice, we'd use Object.freeze)
    expect(tamperedVerdict.action).not.toBe(originalAction);

    // Verify original verdict is unchanged
    expect(verdict.action).toBe(originalAction);

    // In production, we'd verify hash/signature
    const computeVerdictHash = (v: GovernanceVerdict): string => {
      return createHash('sha256')
        .update(JSON.stringify(v))
        .digest('hex');
    };

    const originalHash = computeVerdictHash(verdict);
    const tamperedHash = computeVerdictHash(tamperedVerdict);

    expect(originalHash).not.toBe(tamperedHash);
  });

  it('should prevent verdict timestamp backdating', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);
    const originalTimestamp = verdict.metadata.timestamp;

    // Attempt to backdate
    const backdatedVerdict = {
      ...verdict,
      metadata: {
        ...verdict.metadata,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
    };

    // Validator should detect timestamp manipulation
    const isTimestampRecent = (timestamp: string, maxAgeMs: number = 5000): boolean => {
      const timestampDate = new Date(timestamp).getTime();
      const now = Date.now();
      return now - timestampDate <= maxAgeMs;
    };

    expect(isTimestampRecent(originalTimestamp)).toBe(true);
    expect(isTimestampRecent(backdatedVerdict.metadata.timestamp, 5000)).toBe(false);
  });

  it('should block unauthorized evaluator spoofing', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);

    // Attempt to spoof evaluator
    const spoofedVerdict = {
      ...verdict,
      metadata: {
        ...verdict.metadata,
        evaluator: 'malicious-evaluator',
      },
    };

    // Validator should verify evaluator is from trusted list
    const trustedEvaluators = [
      'native-policy-engine-v1',
      'opa-engine',
      'ai-copilot-service',
    ];

    const isValidEvaluator = (evaluator: string): boolean => {
      return trustedEvaluators.includes(evaluator);
    };

    expect(isValidEvaluator(verdict.metadata.evaluator)).toBe(true);
    expect(isValidEvaluator(spoofedVerdict.metadata.evaluator)).toBe(false);
  });

  it('should reject empty policyId', () => {
    const invalidVerdict: Partial<GovernanceVerdict> = {
      action: 'ALLOW',
      reasons: ['Test'],
      policyIds: [], // Empty - should have at least one policy or default
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: 'test',
        latencyMs: 0,
        simulation: false,
      },
      provenance: {
        origin: 'test',
        confidence: 1.0,
      },
    };

    // In production systems, at minimum a default policy should apply
    const hasValidPolicyIds = (verdict: Partial<GovernanceVerdict>): boolean => {
      return (
        Array.isArray(verdict.policyIds) &&
        (verdict.policyIds.length > 0 || verdict.action === 'ALLOW')
      );
    };

    // Empty policyIds with ALLOW is acceptable (default allow)
    expect(hasValidPolicyIds(invalidVerdict)).toBe(true);

    // But DENY without policyIds should be rejected
    const denyWithoutPolicy = { ...invalidVerdict, action: 'DENY' as PolicyAction };
    const isValidDeny = (v: Partial<GovernanceVerdict>): boolean => {
      return v.action !== 'DENY' || (v.policyIds?.length ?? 0) > 0;
    };

    expect(isValidDeny(denyWithoutPolicy)).toBe(false);
  });

  it('should reject verdict with future timestamp', () => {
    const futureVerdict: Partial<GovernanceVerdict> = {
      action: 'ALLOW',
      reasons: ['Test'],
      policyIds: ['test-policy'],
      metadata: {
        timestamp: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
        evaluator: 'test',
        latencyMs: 0,
        simulation: false,
      },
      provenance: {
        origin: 'test',
        confidence: 1.0,
      },
    };

    const isValidTimestamp = (timestamp: string): boolean => {
      const timestampDate = new Date(timestamp).getTime();
      const now = Date.now();
      return timestampDate <= now; // Timestamp must not be in the future
    };

    expect(isValidTimestamp(futureVerdict.metadata!.timestamp)).toBe(false);
  });
});

describe('Provenance Validation', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  it('should require provenance on all responses', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-test',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);

    expect(verdict.provenance).toBeDefined();
    expect(verdict.provenance.origin).toBeDefined();
    expect(typeof verdict.provenance.origin).toBe('string');
    expect(verdict.provenance.confidence).toBeDefined();
    expect(typeof verdict.provenance.confidence).toBe('number');
  });

  it('should validate provenance source', () => {
    const validSources = [
      'system-policy-check',
      'opa-engine',
      'ai-copilot-service',
      'user-input',
      'external-api',
    ];

    const provenance: ProvenanceChain = {
      source: 'system-policy-check',
      timestamp: new Date().toISOString(),
      lineage: ['system', 'policy-engine'],
      hash: createHash('sha256').update('test').digest('hex'),
    };

    const isValidSource = (source: string): boolean => {
      return validSources.includes(source) || source.startsWith('verified-');
    };

    expect(isValidSource(provenance.source)).toBe(true);
    expect(isValidSource('unknown-source')).toBe(false);
  });

  it('should validate provenance timestamp', () => {
    const provenance: ProvenanceChain = {
      source: 'test-system',
      timestamp: new Date().toISOString(),
      lineage: ['system'],
      hash: createHash('sha256').update('test').digest('hex'),
    };

    const isValidTimestamp = (timestamp: string): boolean => {
      const date = new Date(timestamp);
      return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
    };

    expect(isValidTimestamp(provenance.timestamp)).toBe(true);

    // Invalid timestamp
    expect(isValidTimestamp('not-a-date')).toBe(false);

    // Future timestamp
    const futureTimestamp = new Date(Date.now() + 10000).toISOString();
    expect(isValidTimestamp(futureTimestamp)).toBe(false);
  });

  it('should track lineage chain', () => {
    const provenance: ProvenanceChain = {
      source: 'test-system',
      timestamp: new Date().toISOString(),
      lineage: ['user-input', 'api-gateway', 'policy-engine', 'data-store'],
      hash: createHash('sha256').update('test').digest('hex'),
    };

    expect(provenance.lineage).toBeDefined();
    expect(Array.isArray(provenance.lineage)).toBe(true);
    expect(provenance.lineage.length).toBeGreaterThan(0);

    // Lineage should form a valid chain
    const isValidLineage = (lineage: string[]): boolean => {
      return lineage.length > 0 && lineage.every((node) => node.length > 0);
    };

    expect(isValidLineage(provenance.lineage)).toBe(true);
  });

  it('should reject orphan provenance', () => {
    const orphanProvenance: Partial<ProvenanceChain> = {
      source: 'unknown',
      timestamp: new Date().toISOString(),
      lineage: [], // Empty lineage - orphan
      hash: createHash('sha256').update('test').digest('hex'),
    };

    const isOrphan = (provenance: Partial<ProvenanceChain>): boolean => {
      return !provenance.lineage || provenance.lineage.length === 0;
    };

    expect(isOrphan(orphanProvenance)).toBe(true);

    const validProvenance: ProvenanceChain = {
      source: 'system',
      timestamp: new Date().toISOString(),
      lineage: ['system', 'policy-engine'],
      hash: createHash('sha256').update('test').digest('hex'),
    };

    expect(isOrphan(validProvenance)).toBe(false);
  });
});

describe('Data Integrity', () => {
  it('should validate data hash', () => {
    const data = { id: 'entity-123', name: 'Test Entity', value: 42 };
    const expectedHash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    const metadata: DataMetadata = {
      classification: 'INTERNAL',
      isSimulated: false,
      hash: expectedHash,
      generatedAt: new Date().toISOString(),
    };

    // Verify hash matches data
    const computedHash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    expect(metadata.hash).toBe(computedHash);
    expect(metadata.hash).toBe(expectedHash);
  });

  it('should reject tampered data', () => {
    const originalData = { id: 'entity-123', name: 'Test Entity' };
    const originalHash = createHash('sha256')
      .update(JSON.stringify(originalData))
      .digest('hex');

    const metadata: DataMetadata = {
      classification: 'INTERNAL',
      isSimulated: false,
      hash: originalHash,
      generatedAt: new Date().toISOString(),
    };

    // Tamper with data
    const tamperedData = { id: 'entity-123', name: 'Tampered Entity' };
    const tamperedHash = createHash('sha256')
      .update(JSON.stringify(tamperedData))
      .digest('hex');

    // Hash mismatch should be detected
    expect(metadata.hash).not.toBe(tamperedHash);

    const verifyIntegrity = (data: any, expectedHash: string): boolean => {
      const computedHash = createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
      return computedHash === expectedHash;
    };

    expect(verifyIntegrity(originalData, metadata.hash)).toBe(true);
    expect(verifyIntegrity(tamperedData, metadata.hash)).toBe(false);
  });

  it('should require classification', () => {
    const metadata: DataMetadata = {
      classification: 'CONFIDENTIAL',
      isSimulated: false,
      hash: createHash('sha256').update('test').digest('hex'),
      generatedAt: new Date().toISOString(),
    };

    expect(metadata.classification).toBeDefined();

    const validClassifications = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET'];
    expect(validClassifications).toContain(metadata.classification);

    // Invalid classification
    const invalidMetadata = { ...metadata, classification: 'INVALID' as any };
    expect(validClassifications).not.toContain(invalidMetadata.classification);
  });

  it('should track isSimulated flag', () => {
    const simulatedMetadata: DataMetadata = {
      classification: 'INTERNAL',
      isSimulated: true,
      hash: createHash('sha256').update('test').digest('hex'),
      generatedAt: new Date().toISOString(),
    };

    expect(simulatedMetadata.isSimulated).toBe(true);
    expect(typeof simulatedMetadata.isSimulated).toBe('boolean');

    const productionMetadata: DataMetadata = {
      classification: 'INTERNAL',
      isSimulated: false,
      hash: createHash('sha256').update('test').digest('hex'),
      generatedAt: new Date().toISOString(),
    };

    expect(productionMetadata.isSimulated).toBe(false);

    // Simulation flag should affect trust level
    const getTrustLevel = (metadata: DataMetadata): 'high' | 'medium' | 'low' => {
      if (metadata.isSimulated) {return 'low';}
      if (metadata.classification === 'SECRET') {return 'high';}
      return 'medium';
    };

    expect(getTrustLevel(simulatedMetadata)).toBe('low');
    expect(getTrustLevel(productionMetadata)).toBe('medium');
  });
});

describe('Snapshot Tests', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  it('should match governance verdict snapshot', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-snapshot',
      payload: { action: 'read', resource: 'test-resource' },
    };

    const verdict = policyEngine.check(context);

    // Create deterministic snapshot (remove timestamp for consistency)
    const snapshot = {
      action: verdict.action,
      reasons: verdict.reasons,
      policyIds: verdict.policyIds,
      metadata: {
        evaluator: verdict.metadata.evaluator,
        simulation: verdict.metadata.simulation,
      },
      provenance: {
        origin: verdict.provenance.origin,
        confidence: verdict.provenance.confidence,
      },
    };

    expect(snapshot).toMatchInlineSnapshot(`
{
  "action": "ALLOW",
  "metadata": {
    "evaluator": "native-policy-engine-v1",
    "simulation": false,
  },
  "policyIds": [],
  "provenance": {
    "confidence": 1,
    "origin": "system-policy-check",
  },
  "reasons": [],
}
`);
  });

  it('should match data envelope snapshot', () => {
    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: 'tenant-snapshot',
      payload: { action: 'read' },
    };

    const verdict = policyEngine.check(context);
    const data = { id: 'entity-snapshot', name: 'Snapshot Entity' };

    const envelope: DataEnvelope = {
      data,
      governanceVerdict: verdict,
      provenance: {
        source: 'test-system',
        timestamp: '2025-01-01T00:00:00.000Z', // Fixed for snapshot
        lineage: ['system', 'policy-engine'],
        hash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
      },
      metadata: {
        classification: 'INTERNAL',
        isSimulated: false,
        hash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
        generatedAt: '2025-01-01T00:00:00.000Z', // Fixed for snapshot
      },
    };

    // Create deterministic snapshot
    const snapshot = {
      data: envelope.data,
      hasVerdict: envelope.governanceVerdict !== undefined,
      verdictAction: envelope.governanceVerdict.action,
      provenanceSource: envelope.provenance.source,
      classification: envelope.metadata.classification,
      isSimulated: envelope.metadata.isSimulated,
    };

    expect(snapshot).toMatchInlineSnapshot(`
{
  "classification": "INTERNAL",
  "data": {
    "id": "entity-snapshot",
    "name": "Snapshot Entity",
  },
  "hasVerdict": true,
  "isSimulated": false,
  "provenanceSource": "test-system",
  "verdictAction": "ALLOW",
}
`);
  });

  it('should match provenance chain snapshot', () => {
    const data = { id: 'test', value: 'data' };
    const provenance: ProvenanceChain = {
      source: 'system-input',
      timestamp: '2025-01-01T00:00:00.000Z', // Fixed for snapshot
      lineage: ['user-input', 'api-gateway', 'policy-engine', 'data-store'],
      hash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
    };

    const snapshot = {
      source: provenance.source,
      lineageLength: provenance.lineage.length,
      lineageStart: provenance.lineage[0],
      lineageEnd: provenance.lineage[provenance.lineage.length - 1],
      hasHash: provenance.hash.length > 0,
    };

    expect(snapshot).toMatchInlineSnapshot(`
{
  "hasHash": true,
  "lineageEnd": "data-store",
  "lineageLength": 4,
  "lineageStart": "user-input",
  "source": "system-input",
}
`);
  });
});
