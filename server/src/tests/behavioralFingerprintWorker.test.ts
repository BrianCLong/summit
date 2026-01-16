import { describe, it, expect, jest } from '@jest/globals';

await jest.unstable_mockModule('../services/EntityResolutionService.js', () => ({
  EntityResolutionService: class {
    fuseBehavioralFingerprint() {
      return { fingerprint: 'fp', score: 0.9 };
    }

    clusterIdentitiesAcrossProjects(identities: Array<{ id: string }>) {
      return new Map([['cluster-1', identities.map((i) => i.id)]]);
    }
  },
}));

const { runBehavioralFingerprintJob } = await import('../workers/behavioralFingerprintWorker.js');

describe('behavioral fingerprint job', () => {
  it('scores and clusters identities across projects', async () => {
    const data = [
      {
        id: 'alice',
        projectId: 'A',
        telemetry: [
          { clicks: 10, timeInView: 120, editRate: 2 },
          { clicks: 5, timeInView: 60, editRate: 1 },
        ],
      },
      {
        id: 'bob',
        projectId: 'B',
        telemetry: [
          { clicks: 11, timeInView: 118, editRate: 2 },
          { clicks: 4, timeInView: 70, editRate: 1 },
        ],
      },
      {
        id: 'charlie',
        projectId: 'C',
        telemetry: [{ clicks: 1, timeInView: 10, editRate: 0.5 }],
      },
    ];
    const result = await runBehavioralFingerprintJob(data);
    expect(result.fingerprints.length).toBe(3);
    const clusters = Array.from(result.clusters.values());
    const clusterWithAlice = clusters.find((c) => c.includes('alice'));
    expect(clusterWithAlice).toBeDefined();
    expect(clusterWithAlice).toContain('bob');
  });
});
