import { registerModel } from '../src/conductor/models';

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
