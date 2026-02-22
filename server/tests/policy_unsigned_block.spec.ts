import { loadSignedPolicy } from '../src/policy/loader';

describe('policy unsigned gate', () => {
  const prev = process.env.ALLOW_UNSIGNED_POLICY;
  beforeAll(() => {
    delete process.env.ALLOW_UNSIGNED_POLICY;
  });
  afterAll(() => {
    if (prev !== undefined) process.env.ALLOW_UNSIGNED_POLICY = prev;
  });

  it('blocks when signature missing and override not set', async () => {
    await expect(loadSignedPolicy('bundle.tgz' as any)).rejects.toBeTruthy();
  });
});
