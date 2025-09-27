import { CaffClient, Flag, SubjectContext } from '../src/caff';

describe('CAFF SDK', () => {
  const client = new CaffClient('http://localhost:8080', async () => {
    throw new Error('network not expected in unit tests');
  });

  it('produces deterministic bucket decisions', () => {
    const flag: Flag = {
      key: 'beta-feature',
      purposes: ['analytics'],
      jurisdictions: ['US'],
      audiences: ['beta'],
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      rollout: { percentage: 30 },
    };

    const context: SubjectContext = {
      subjectId: 'user-42',
      jurisdiction: 'US',
      audiences: ['beta'],
      consents: { analytics: 'granted' },
    };

    const first = client.evaluateLocal(flag, context);
    const second = client.evaluateLocal(flag, context);

    expect(first.decision).toEqual(second.decision);
    expect(first.explainPath).toEqual(second.explainPath);
  });

  it('requests step-up when consent missing', () => {
    const flag: Flag = {
      key: 'ads',
      purposes: ['ads'],
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      rollout: { percentage: 100 },
    };

    const context: SubjectContext = { subjectId: 'u-1' };
    const result = client.evaluateLocal(flag, context);
    expect(result.decision).toBe('step-up');
  });
});
