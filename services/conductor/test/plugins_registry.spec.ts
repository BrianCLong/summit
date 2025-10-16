jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest
      .fn()
      .mockResolvedValue({
        rows: [{ id: 'plugin-1', name: 'x', version: '1', capabilities: {} }],
      }),
  })),
}));
jest.mock('node:child_process', () => ({
  execFile: (
    _cmd: string,
    _args: string[],
    cb: (error: Error | null) => void,
  ) => cb(new Error('cosign missing')),
}));

import { registerPlugin } from '../src/plugins/registry';
test('rejects missing signature', async () => {
  await expect(
    registerPlugin(
      {
        name: 'x',
        version: '1',
        ociUri: 'oci://x',
        digest: 'sha256:abc',
        signature: '',
        capabilities: {},
      },
      'me',
    ),
  ).rejects.toBeTruthy();
});
