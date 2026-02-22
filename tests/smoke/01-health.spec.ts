import { test, expect } from '@playwright/test';

test('health endpoint returns ok', async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/healthz`);
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  expect(body).toMatch(/ok|healthy/i);
});

test('version endpoint present', async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/version`);
  expect(res.ok()).toBeTruthy();
  const txt = await res.text();
  expect(txt).toMatch(/2\.5\.0/);
});
