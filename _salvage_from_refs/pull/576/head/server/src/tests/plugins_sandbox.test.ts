import { PluginHost } from '../plugins/PluginHost';
import { requireCapability } from '../plugins/api/Capabilities';
import fs from 'fs';

describe('Plugin sandbox', () => {
  it('rejects unsigned plugin', async () => {
    const host = new PluginHost();
    fs.writeFileSync('/tmp/p.wasm', 'x');
    await expect(host.load({ name: 'p', version: '1', capabilities: [], signature: '', sbomDigest: 'bad' }, '/tmp/p.wasm')).rejects.toThrow();
  });

  it('denies capability without token', () => {
    expect(() => requireCapability('export', ['readGraph'] as any)).toThrow('capability denied');
  });
});
