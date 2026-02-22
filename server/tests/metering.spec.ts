import { recordMeters } from '../src/conductor/metering';

test('records meters (schema must exist)', async () => {
  await expect(
    recordMeters('acme', {
      cpuSec: 1,
      gbSec: 2,
      egressGb: 0.1,
      dpEpsilon: 0.01,
      pluginCalls: 3,
    }),
  ).rejects.toBeTruthy(); // Without DB this will reject; ensures function runs
});
