import { allow } from "../../src/abac";

test("deny on OPA down", async () => {
  process.env.OPA_URL = "http://localhost:5999/v1/data/abac/allow";
  const ok = await allow({ tenantId: "t" }, "read", { type: "person", id: "x" });
  expect(ok).toBe(false);
});
