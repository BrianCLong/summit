import path from "path";
import { loadPolicy, evaluate } from "../src/policy-engine";

it("allows read under S2", () => {
  const p = loadPolicy(path.join(__dirname, "..", "policies", "examples", "allow-read-low.json"));
  const decision = evaluate(p, {
    action: "graph:read",
    resource: "node:abc",
    attributes: { sensitivity: "S1" },
  });
  expect(decision.allowed).toBe(true);
});

it("denies export without purpose match", () => {
  const p = loadPolicy(
    path.join(__dirname, "..", "policies", "examples", "deny-export-no-purpose.json")
  );
  const decision = evaluate(p, {
    action: "export:bundle",
    resource: "case:1",
    attributes: { purpose: "internal" },
  });
  expect(decision.allowed).toBe(false);
  expect(decision.reason).toMatch(/requires declared audience/);
});
