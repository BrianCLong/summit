import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { applyDelta, buildMicroIndex, queryMicroIndex } from '../microindex.js';
import { computePolicyScopeId } from '../psid.js';
import {
  AuthorizedObjects,
  BudgetConfig,
  MicroIndex,
  PolicyScope,
  SubjectBucket,
} from '../types.js';

describe('Policy-Compiled Micro-Index', () => {
  const baseSubjectBucket: SubjectBucket = {
    roles: ['secops', 'analyst'],
    attributes: { region: 'us', clearance: 3 },
  };

  const baseScope: PolicyScope = {
    tenant: 't1',
    purpose: 'incident_response',
    policyVersion: 'p1',
    schemaVersion: 's1',
    subjectBucket: baseSubjectBucket,
  };

  const authorized: AuthorizedObjects = {
    documents: [
      {
        id: 'doc-1',
        text: 'malware detected in us region',
        embedding: [0.2, 0.1, 0.7],
        metadata: { sensitivity: 'low' },
      },
      {
        id: 'doc-2',
        text: 'incident response playbook for rce',
        embedding: [0.5, 0.5, 0.1],
        metadata: { sensitivity: 'medium' },
      },
    ],
    nodes: [
      { id: 'node-1', embedding: [0.1, 0.3, 0.4], metadata: { type: 'host' } },
      { id: 'node-2', embedding: [0.4, 0.6, 0.2], metadata: { type: 'alert' } },
    ],
    edges: [
      { from: 'doc-1', to: 'node-1', type: 'references' },
      { from: 'node-1', to: 'node-2', type: 'alerts' },
    ],
    redactionProfile: { mode: 'mask', fields: ['user'] },
  };

  const budgets: BudgetConfig = {
    vectorK: 5,
    lexK: 5,
    maxHops: 2,
    maxExpansions: 10,
  };

  const queryEmbedding = [0.2, 0.2, 0.6];

  it('computes deterministic PSIDs for the same normalized scope', () => {
    const shuffledScope: PolicyScope = {
      ...baseScope,
      subjectBucket: {
        roles: ['analyst', 'secops'],
        attributes: { clearance: 3, region: 'us' },
      },
    };

    const first = computePolicyScopeId(baseScope);
    const second = computePolicyScopeId(shuffledScope);
    const bumpedPolicy = computePolicyScopeId({ ...baseScope, policyVersion: 'p2' });

    expect(first).toEqual(second);
    expect(bumpedPolicy).not.toEqual(first);
  });

  it('builds a micro-index with a seal and enforces adjacency-bounded retrieval', () => {
    const microIndex = buildMicroIndex(baseScope, authorized);
    const response = queryMicroIndex(microIndex, 'incident response', queryEmbedding, budgets, 1337, 2);

    expect(response.audit.psid).toEqual(computePolicyScopeId(baseScope));
    expect(response.audit.seal.objectSetHash).toBeDefined();
    expect(response.evidence.length).toBeGreaterThan(0);

    const traversed = response.evidence.map((item) => item.id);
    expect(traversed.every((id) => microIndex.adjacency.has(id) || microIndex.metadata.has(id))).toBe(true);
  });

  it('applies deltas and preserves deterministic seals', () => {
    const microIndex = buildMicroIndex(baseScope, authorized);
    const deltaIndex: MicroIndex = applyDelta(microIndex, {
      operation: 'insert',
      document: {
        id: 'doc-3',
        text: 'graph enrichment guide',
        embedding: [0.3, 0.5, 0.6],
        metadata: { sensitivity: 'low' },
      },
    });

    const response = queryMicroIndex(deltaIndex, 'graph enrichment', [0.3, 0.4, 0.6], budgets, 99, 3);

    expect(deltaIndex.deltaLog).toHaveLength(1);
    expect(deltaIndex.seal.objectSetHash).not.toEqual(microIndex.seal.objectSetHash);
    expect(response.evidence.some((item) => item.id === 'doc-3')).toBe(true);
  });
});
