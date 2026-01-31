import { loadSignedPolicy } from '../src/policy/loader';

describe('policy signature verification', () => {
  it('rejects unsigned policy', async () => {
    await expect(
      loadSignedPolicy('bundle.tgz', 'bad.sig'),
    ).rejects.toBeTruthy();
  });
});
