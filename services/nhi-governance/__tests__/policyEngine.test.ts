import { evaluatePolicies } from '../policies/policyEngine.js';
import { InventoryGraph } from '../models.js';

const buildGraph = (): InventoryGraph => ({
  nhis: [
    {
      id: 'nhi-1',
      name: 'wildcard-nhi',
      kind: 'service-account',
      permissions: [{ role: 'admin', resource: '*' }],
      credentials: ['cred-1'],
      provenance: {
        discoveredBy: 'test',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:00:00Z',
        evidence: [],
        confidence: 'high',
      },
    },
  ],
  credentials: [
    {
      id: 'cred-1',
      name: 'long-lived-token',
      kind: 'token',
      boundTo: 'nhi-1',
      issuedAt: '2023-01-01T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      rotationIntervalDays: 400,
      provenance: {
        discoveredBy: 'test',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:00:00Z',
        evidence: [],
        confidence: 'high',
      },
    },
    {
      id: 'cred-2',
      name: 'inline-secret',
      kind: 'secret',
      boundTo: 'nhi-1',
      secretSource: '/tmp/example.txt',
      provenance: {
        discoveredBy: 'test',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:00:00Z',
        evidence: [],
        confidence: 'high',
      },
    },
  ],
  cryptoAssets: [
    {
      id: 'crypto-1',
      name: 'legacy-key',
      kind: 'kms-key',
      algorithm: 'rsa-2048',
      expiresAt: '2023-12-31T00:00:00Z',
      provenance: {
        discoveredBy: 'test',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-01T00:00:00Z',
        evidence: [],
        confidence: 'high',
      },
    },
  ],
});

describe('evaluatePolicies', () => {
  it('flags long-lived credentials, wildcard permissions, inline secrets, and legacy crypto', () => {
    const report = evaluatePolicies(buildGraph(), 90);
    const rules = report.violations.map((v) => v.rule);

    expect(rules).toEqual(
      expect.arrayContaining([
        'credential.max-ttl',
        'nhi.least-privilege',
        'credential.in-code-secret',
        'crypto.legacy-algorithm',
        'crypto.expired',
        'crypto.pqc-missing',
      ]),
    );
  });
});
