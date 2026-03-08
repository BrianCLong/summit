import { describe, it, expect } from '@jest/globals';
import { SynintMapper } from "../SynintMapper.js";

describe("SynintMapper", () => {
  it("maps whois findings into Domain + REGISTERED_TO", () => {
    const mapper = new SynintMapper({ sourceTag: "synint" });

    const muts = mapper.toMutations({
      target: "example.com",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      agents: [
        { agentName: "WhoisAgent", success: true, findings: { domain: "example.com", registrantOrg: "Example Org" } },
      ],
    });

    const hasDomain = muts.some(m => m.kind === "upsertNode" && m.node.id === "domain:example.com");
    expect(hasDomain).toBe(true);

    const hasEdge = muts.some(m => m.kind === "upsertEdge" && m.edge.type === "REGISTERED_TO");
    expect(hasEdge).toBe(true);
  });
});
