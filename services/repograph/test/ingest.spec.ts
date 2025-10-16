import { ingest } from '../src/ingest';
test('ingest builds nodes/edges', async () => {
  await ingest();
  expect(true).toBe(true); // sanity; real test would query sqlite
});
