import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { endpointOwnership } from '../endpoint-ownership.js';

describe('endpoint ownership map', () => {
  it('records policy touchpoints for action preflight', () => {
    const preflight = endpointOwnership.find(
      (entry) => entry.path === '/api/actions/preflight',
    );
    expect(preflight?.owners).toContain('governance');
    expect(preflight?.policyMiddleware).toContain('auditFirstMiddleware');
  });

  it('tracks execution guard endpoint', () => {
    const execute = endpointOwnership.find(
      (entry) => entry.path === '/api/actions/execute',
    );
    expect(execute?.policyMiddleware).toContain('ActionPolicyService');
  });
});
