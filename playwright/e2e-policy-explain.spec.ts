import { test, expect } from "@playwright/test";

test("policy explain denies with reason", async ({ request }) => {
  const res = await request.post("http://localhost:4000/policy/explain", {
    data: { query: "{ dangerousOp }" },
  });
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.allowed).toBeFalsy();
  expect(json.reason).toContain("Denied");
});
