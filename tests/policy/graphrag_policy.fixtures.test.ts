import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

type PolicyRule = {
  id: string;
  when: {
    tenant_required?: boolean;
    max_hops_lte?: number;
    query_contains_any?: string[];
  };
  action: "allow" | "deny";
};

type GraphRagPolicy = {
  default: "allow" | "deny";
  rules: PolicyRule[];
};

type Fixture = {
  tenant?: string;
  query: string;
  maxHops: number;
};

const policyPath = path.join("policy", "graphrag", "policy.yaml");
const fixturesDir = path.join("policy", "graphrag", "fixtures");

function loadPolicy(): GraphRagPolicy {
  const raw = fs.readFileSync(policyPath, "utf8");
  return yaml.load(raw) as GraphRagPolicy;
}

function evaluate(policy: GraphRagPolicy, fixture: Fixture): "allow" | "deny" {
  for (const rule of policy.rules) {
    if (rule.when.query_contains_any) {
      const hit = rule.when.query_contains_any.some((term) =>
        fixture.query.toLowerCase().includes(term.toLowerCase()),
      );
      if (hit) {
        return rule.action;
      }
    }
    if (rule.when.tenant_required && !fixture.tenant) {
      continue;
    }
    if (
      typeof rule.when.max_hops_lte === "number" &&
      fixture.maxHops > rule.when.max_hops_lte
    ) {
      continue;
    }
    if (rule.when.tenant_required || rule.when.max_hops_lte !== undefined) {
      return rule.action;
    }
  }
  return policy.default;
}

describe("GraphRAG policy fixtures", () => {
  const policy = loadPolicy();

  it("denies fixtures missing tenant scope", () => {
    const fixture = JSON.parse(
      fs.readFileSync(
        path.join(fixturesDir, "deny", "missing-tenant.json"),
        "utf8",
      ),
    ) as Fixture;

    expect(evaluate(policy, fixture)).toBe("deny");
  });

  it("denies fixtures exceeding hop limits", () => {
    const fixture = JSON.parse(
      fs.readFileSync(
        path.join(fixturesDir, "deny", "max-hops-too-high.json"),
        "utf8",
      ),
    ) as Fixture;

    expect(evaluate(policy, fixture)).toBe("deny");
  });

  it("denies prompt injection fixtures", () => {
    const fixture = JSON.parse(
      fs.readFileSync(
        path.join(fixturesDir, "deny", "prompt-injection.json"),
        "utf8",
      ),
    ) as Fixture;

    expect(evaluate(policy, fixture)).toBe("deny");
  });

  it("allows tenant-scoped fixtures within hop limits", () => {
    const fixture = JSON.parse(
      fs.readFileSync(
        path.join(fixturesDir, "allow", "tenant-scoped.json"),
        "utf8",
      ),
    ) as Fixture;

    expect(evaluate(policy, fixture)).toBe("allow");
  });
});
