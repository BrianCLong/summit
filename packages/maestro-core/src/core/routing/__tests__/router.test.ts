import { describe, it, expect } from "@jest/globals";
import { defaultCatalog } from "../defaultCatalog";
import { CostAwareRouter } from "../CostAwareRouter";

describe("CostAwareRouter", () => {
  it("routes easy queries to cheaper models", () => {
    const r = new CostAwareRouter(defaultCatalog(), { easyMax: 0.3, mediumMax: 0.7 });
    const d = r.selectModel({ difficulty: 0.2, domain: "general" });
    expect(d.model.costWeight).toBeLessThanOrEqual(2);
  });

  it("routes hard queries to stronger models", () => {
    const r = new CostAwareRouter(defaultCatalog(), { easyMax: 0.3, mediumMax: 0.7 });
    const d = r.selectModel({ difficulty: 0.9, domain: "math" });
    expect(d.model.capability).toBeGreaterThan(0.8);
  });

  it("honors domain overrides", () => {
    const r = new CostAwareRouter(defaultCatalog(), {
      easyMax: 0.3,
      mediumMax: 0.7,
      domainOverrides: { legal: { preferModelIds: ["strong"] } }
    });
    const d = r.selectModel({ difficulty: 0.1, domain: "legal" });
    expect(d.model.id).toBe("strong");
  });
});
