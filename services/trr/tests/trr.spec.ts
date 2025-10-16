import { describe, expect, it } from 'vitest';
import {
  AllowlistSigner,
  ToolRiskRegistry,
  createTesqPolicyHook,
  severityWeights,
} from '../src/index.js';

const SECRET = 'super-secret-key';

function createRegistry() {
  return new ToolRiskRegistry();
}

describe('ToolRiskRegistry end-to-end', () => {
  it('updates risk scores and manifests deterministically from NVD feed changes', () => {
    const registry = createRegistry();
    registry.registerTool({
      tool: 'tesq-tool',
      version: '1.0.0',
      sbomDigest: 'sha256:abc123',
      dataAccessScope: 'write',
      networkEgressClasses: ['restricted'],
    });

    const initialFeed = {
      vulnerabilities: [
        {
          published: '2024-01-02T00:00:00.000Z',
          cve: {
            id: 'CVE-2024-0001',
            descriptions: [{ lang: 'en', value: 'Initial vulnerability.' }],
            metrics: {
              cvssMetricV31: [
                {
                  cvssData: {
                    baseScore: 8.1,
                    baseSeverity: 'HIGH',
                  },
                },
              ],
            },
            configurations: {
              nodes: [
                {
                  cpeMatch: [
                    {
                      vulnerable: true,
                      criteria: 'cpe:/a:acme:tesq-tool:1.0.0',
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    };

    registry.ingestNvdFeed(initialFeed);
    const afterInitial = registry.getProfile('tesq-tool', '1.0.0');
    expect(afterInitial?.riskScore).toBe(1 + severityWeights().HIGH + 3 + 1);

    const signer = new AllowlistSigner({
      secret: SECRET,
      keyId: 'tesq-test-key',
      deterministicBase: '2024-01-01T00:00:00.000Z',
    });
    const manifest = registry.generateAllowlistManifest(signer, {
      environment: 'prod',
      riskThreshold: 15,
    });

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.signature).toMatch(/^[a-f0-9]+$/);

    const manifestCopy = registry.generateAllowlistManifest(signer, {
      environment: 'prod',
      riskThreshold: 15,
    });
    expect(manifestCopy).toEqual(manifest);

    const updatedFeed = {
      vulnerabilities: [
        ...initialFeed.vulnerabilities,
        {
          published: '2024-02-10T00:00:00.000Z',
          cve: {
            id: 'CVE-2024-1000',
            descriptions: [{ lang: 'en', value: 'Critical remote execution.' }],
            metrics: {
              cvssMetricV31: [
                {
                  cvssData: {
                    baseScore: 9.9,
                    baseSeverity: 'CRITICAL',
                  },
                },
              ],
            },
            configurations: {
              nodes: [
                {
                  cpeMatch: [
                    {
                      vulnerable: true,
                      criteria: 'cpe:/a:acme:tesq-tool:1.0.0',
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    };

    registry.ingestNvdFeed(updatedFeed);
    const afterUpdate = registry.getProfile('tesq-tool', '1.0.0');
    expect(afterUpdate?.riskScore).toBe(
      1 + severityWeights().HIGH + severityWeights().CRITICAL + 3 + 1,
    );

    const updatedManifest = registry.generateAllowlistManifest(signer, {
      environment: 'prod',
      riskThreshold: 15,
    });
    expect(updatedManifest.entries).toHaveLength(0);
    expect(updatedManifest.signature).not.toEqual(manifest.signature);
  });

  it('TESQ policy hook enforces the allowlist manifest', () => {
    const registry = createRegistry();
    registry.registerTool({
      tool: 'tesq-tool',
      version: '1.0.0',
      sbomDigest: 'sha256:abc123',
      dataAccessScope: 'read',
      networkEgressClasses: ['none'],
    });

    const feed = {
      vulnerabilities: [],
    };
    registry.ingestNvdFeed(feed);

    const signer = new AllowlistSigner({
      secret: SECRET,
      keyId: 'tesq-test-key',
      deterministicBase: '2024-01-01T00:00:00.000Z',
    });

    const manifest = registry.generateAllowlistManifest(signer, {
      environment: 'sandbox',
      riskThreshold: 10,
    });

    const enforce = createTesqPolicyHook(manifest);
    const allowed = enforce({
      tool: 'tesq-tool',
      version: '1.0.0',
      environment: 'sandbox',
    });
    expect(allowed.riskScore).toBeLessThanOrEqual(10);
    expect(() =>
      enforce({ tool: 'tesq-tool', version: '2.0.0', environment: 'sandbox' }),
    ).toThrowError();
    expect(() =>
      enforce({ tool: 'tesq-tool', version: '1.0.0', environment: 'prod' }),
    ).toThrowError();
  });
});
