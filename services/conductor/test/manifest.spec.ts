import { buildManifest } from '../src/replay/manifest';

describe('Run Manifest Integration', () => {
  it('should reject writes without run_id', async () => {
    await expect(buildManifest('')).rejects.toThrow('run_id is required to write run manifest (deny-by-default)');
    await expect(buildManifest(null as any)).rejects.toThrow('run_id is required to write run manifest (deny-by-default)');
  });
});
