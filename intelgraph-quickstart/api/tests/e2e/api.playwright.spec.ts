import { test, expect } from "@playwright/test";

const url = "http://localhost:4000/graphql";

test("search persons returns results", async ({ request }) => {
  const res = await request.post(url, {
    data: { query: '{ searchPersons(q:"a", limit: 3){ id name } }' },
    headers: { "x-tenant": "demo-tenant" },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data.searchPersons)).toBe(true);
});
