import request from "supertest";
import path from "path";
import app from "../src/index";
import { mergePolicies, discoverPolicies } from "../src/policy-store";
import { explainDecision } from "../src/policy-store";

describe("policy-lac HTTP API", () => {
  it("denies export without purpose", async () => {
    const res = await request(app)
      .post("/policy/explain")
      .send({ action: "export:bundle", resource: "case:1", attributes: { purpose: "internal" } });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.reason).toMatch(/Denied/);
  });

  it("allows read under S2", async () => {
    const res = await request(app)
      .post("/policy/explain")
      .send({ action: "graph:read", resource: "node:abc", attributes: { sensitivity: "S1" } });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
  });

  it("reloads and diffs policies", async () => {
    const reload = await request(app).post("/policy/reload");
    expect(reload.status).toBe(200);
    expect(reload.body.rules).toBeGreaterThan(0);

    const dir = path.join(__dirname, "..", "policies", "examples");
    const current = mergePolicies(discoverPolicies(dir));
    const diff = await request(app)
      .post("/policy/diff")
      .send({
        leftPath: path.join(dir, "allow-read-low.json"),
        rightPath: path.join(dir, "deny-export-no-purpose.json"),
      });
    expect(diff.status).toBe(200);
    const body = diff.body as { added: string[]; removed: string[]; changed: string[] };
    expect(Array.isArray(body.added)).toBe(true);
    expect(Array.isArray(body.removed)).toBe(true);
    expect(Array.isArray(body.changed)).toBe(true);
    expect(body.added.length + body.removed.length + body.changed.length).toBeGreaterThanOrEqual(1);

    // also verify direct evaluation stays deterministic
    const decision = explainDecision(current, {
      action: "graph:read",
      resource: "node:xyz",
      attributes: { sensitivity: "S1" },
    });
    expect(decision.allowed).toBe(true);
  });
});
