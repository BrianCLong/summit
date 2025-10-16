import { test } from '@playwright/test';

test.describe.skip('collaboration delta sync latency', () => {
  test('50 concurrent editors stay under 200ms p95', async () => {
    // TODO: implement simulation of 50 clients editing the same document
  });
});
