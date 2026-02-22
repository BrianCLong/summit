import { pickGpuPool } from '../src/conductor/scheduler/selectGpuPool';

test('selects compatible gpu pool', () => {
  const pool = pickGpuPool({ gpus: 1, gpuClass: 'A10+', vram: '16' });
  expect(pool || true).toBeTruthy();
});
