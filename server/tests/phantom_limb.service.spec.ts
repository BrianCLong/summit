// server/tests/phantom_limb.service.spec.ts
import { PhantomLimbService } from '../src/phantom_limb/PhantomLimbService';
import { AnalystArtifacts } from '../src/phantom_limb/phantom_limb.types';

jest.useFakeTimers();

describe('PhantomLimbService', () => {
  let phantomLimbService: PhantomLimbService;

  beforeEach(() => {
    phantomLimbService = new PhantomLimbService();
  });

  it('should initialize with three legendary analysts', async () => {
    const analysts = await phantomLimbService.getOnlineAnalysts();
    expect(analysts).toHaveLength(3);
    expect(analysts.map(a => a.sourceAnalystName)).toContain('Grace Hopper');
  });

  it('should reconstitute a new digital ghost', async () => {
    const artifacts: AnalystArtifacts = {
      sourceAnalystId: 'test-001',
      sourceAnalystName: 'Test Analyst',
      artifactUris: ['uri1', 'uri2'],
    };
    const newGhostPromise = phantomLimbService.reconstituteCognition(artifacts);
    await jest.runAllTimersAsync();
    const newGhost = await newGhostPromise;

    expect(newGhost).toBeDefined();
    expect(newGhost.sourceAnalystName).toBe('Test Analyst');
    expect(newGhost.status).toBe('online');

    const analysts = await phantomLimbService.getOnlineAnalysts();
    expect(analysts).toHaveLength(4);
  });

  it('should allow querying an online digital ghost', async () => {
    const analysts = await phantomLimbService.getOnlineAnalysts();
    const ghostId = analysts[0].ghostId;
    const query = 'What is the primary threat vector?';

    const responsePromise = phantomLimbService.queryDigitalGhost(ghostId, query);
    await jest.runAllTimersAsync();
    const response = await responsePromise;

    expect(response).toBeDefined();
    expect(response.ghostId).toBe(ghostId);
    expect(response.query).toBe(query);
    expect(response.confidence).toBeGreaterThan(0.9);
  });

  it('should throw an error when querying a non-existent ghost', async () => {
    await expect(phantomLimbService.queryDigitalGhost('unknown-ghost', 'query')).rejects.toThrow(
      'Digital ghost unknown-ghost is not online or does not exist.',
    );
  });
});
