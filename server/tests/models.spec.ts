import { registerModel } from '../src/conductor/models.js';

test('rejects unsigned model', async () => {
  await expect(
    registerModel(
      {
        name: 'm',
        version: '1',
        type: 'ER',
        uri: 'oci://x',
        signature: '',
        metrics: {},
      },
      'tester',
    ),
  ).rejects.toBeTruthy();
});
