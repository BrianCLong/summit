import path from "path";
import { spawnSync } from "child_process";

describe("cleanrooms dp policy", () => {
  test("allows compliant request", () => {
    const policy = path.join(__dirname, "../../policies/cleanrooms_dp.rego");
    const input = {
      manifest: { piiOff: true, kMin: 5, epsilonCap: 1 },
      ctx: { persisted: true },
      query: { cohortSize: 10, epsilon: 0.1 },
      accountant: { spent: 0 },
    };
    const res = spawnSync(
      "opa",
      ["eval", "-i", "-", "-d", policy, "data.intelgraph.cleanrooms.dp.allow"],
      { input: JSON.stringify(input) }
    );
    if (res.error) {
      console.warn("opa binary not available, skipping policy test");
      return;
    }
    const out = JSON.parse(res.stdout.toString());
    expect(out.result[0].expressions[0].value).toBe(true);
  });
});
