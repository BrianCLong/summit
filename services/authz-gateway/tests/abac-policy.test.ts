import request from 'supertest';
import { AbacLocalEvaluator } from '../src/abac-local-evaluator';
import { buildPolicyBundle } from '../src/standards';
import { createApp } from '../src/index';
import type { AuthorizationInput } from '../src/types';

jest.mock('jose', () => require('./jose-mock'));
jest.mock('../src/observability', () => require('./observability-stub'));
jest.mock('../src/attribute-service', () => {
  class MockAttributeService {
    async getSubjectAttributes(id: string) {
      return {
        id,
        tenantId: 'intelgraph',
        org: 'intelgraph',
        role: 'analyst',
        roles: ['analyst'],
        entitlements: [],
        residency: 'us',
        region: 'us',
        clearance: 'top-secret',
        auth_strength: 'loa1',
        loa: 'loa1',
        riskScore: 0,
        groups: [],
        metadata: {},
      };
    }

    async getResourceAttributes(resourceId: string) {
      return {
        id: resourceId,
        tenantId: 'intelgraph',
        owner: 'intelgraph',
        residency: 'us',
        classification: 'confidential',
        customer_id: 'intelgraph-customer',
        tags: [],
      };
    }

    getDecisionContext(currentAcr: string) {
      return {
        protectedActions: [],
        requestTime: new Date().toISOString(),
        currentAcr,
      };
    }

    listProtectedActions() {
      return [] as string[];
    }

    invalidateResource() {}
    invalidateSubject() {}
  }

  return { AttributeService: MockAttributeService };
});

const baseInput: AuthorizationInput = {
  subject: {
    id: 'alice',
    tenantId: 'intelgraph',
    org: 'intelgraph',
    role: 'analyst',
    roles: ['analyst'],
    entitlements: [],
    residency: 'us',
    region: 'us',
    clearance: 'secret',
    auth_strength: 'loa1',
    loa: 'loa1',
    riskScore: 0,
    groups: [],
    metadata: {},
  },
  resource: {
    id: 'doc-1',
    tenantId: 'intelgraph',
    owner: 'intelgraph',
    residency: 'us',
    classification: 'confidential',
    customer_id: 'intelgraph-customer',
    tags: [],
  },
  action: 'read',
  context: {
    protectedActions: [],
    requestTime: new Date().toISOString(),
    currentAcr: 'loa1',
  },
};

describe('ABAC bundle evaluation', () => {
  it('enforces residency alignment', () => {
    const evaluator = new AbacLocalEvaluator();
    const input = {
      ...baseInput,
      resource: { ...baseInput.resource, residency: 'eu' },
    };
    const { decision } = evaluator.evaluate(input);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('residency_mismatch');
    expect(decision.decisionId).toBeDefined();
    expect(decision.inputsHash).toHaveLength(64);
  });

  it('requires step-up for export when auth_strength is low', () => {
    const evaluator = new AbacLocalEvaluator();
    const input = { ...baseInput, action: 'export' };
    const { decision } = evaluator.evaluate(input);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('step_up_required');
    expect(decision.obligations).toEqual([
      expect.objectContaining({ type: 'step_up', requirement: 'loa2' }),
    ]);
  });

  it('allows when all ABAC checks pass', () => {
    const evaluator = new AbacLocalEvaluator();
    const input = {
      ...baseInput,
      subject: { ...baseInput.subject, auth_strength: 'loa2' },
      action: 'write',
    };
    const { decision } = evaluator.evaluate(input);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('allow');
  });
});

describe('policy bundle export', () => {
  it('includes rego and data with version metadata', () => {
    const bundle = buildPolicyBundle();
    expect(bundle.version).toBeDefined();
    const rego = Buffer.from(bundle.policies[0].contents, 'base64').toString('utf8');
    const data = JSON.parse(Buffer.from(bundle.data[0].contents, 'base64').toString('utf8'));
    expect(rego).toContain('package summit.abac.v1');
    expect(data.classification.levels.secret).toBeGreaterThan(0);
    expect(bundle.manifest.policy_version).toBeDefined();
  });
});

describe('ABAC enforcement wrapper', () => {
  it('denies export without step-up and returns obligation via demo route', async () => {
    const app = await createApp();
    const response = await request(app)
      .post('/abac/demo/enforce')
      .send({
        subjectId: 'alice',
        action: 'export',
        resource: {
          id: 'dataset-1',
          residency: 'us',
          classification: 'confidential',
        },
      });

    expect(response.status).toBe(403);
    expect(response.body.reason).toBe('step_up_required');
    expect(response.body.policyVersion).toBeDefined();
    expect(response.body.obligations).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'step_up' })]),
    );
  });
});
