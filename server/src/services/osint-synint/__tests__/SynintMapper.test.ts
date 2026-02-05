// server/src/services/osint-synint/__tests__/SynintMapper.test.ts

import { SynintMapper } from "../SynintMapper.js";
import { SynintSweepResult } from "../types.js";

describe("SynintMapper", () => {
  const mapper = new SynintMapper({ sourceTag: "synint-test" });

  test("maps whois findings into Domain + Organization nodes and REGISTERED_TO edge", () => {
    const sweep: SynintSweepResult = {
      target: "example.com",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      agents: [
        {
          agentName: "WhoisAgent",
          success: true,
          findings: { domain: "example.com", registrantOrg: "Example Org" },
        },
      ],
    };

    const muts = mapper.toMutations(sweep);

    // Audit event
    expect(muts.some(m => m.kind === "emitEvent" && m.event.type === "osint.sweep.completed")).toBe(true);

    // Domain node
    const domainNode = muts.find(m => m.kind === "upsertNode" && m.node.id === "domain:example.com") as any;
    expect(domainNode).toBeDefined();
    expect(domainNode.node.labels).toContain("Domain");

    // Org node
    const orgNode = muts.find(m => m.kind === "upsertNode" && m.node.id === "org:Example Org") as any;
    expect(orgNode).toBeDefined();
    expect(orgNode.node.labels).toContain("Organization");

    // Edge
    const edge = muts.find(m => m.kind === "upsertEdge" && m.edge.type === "REGISTERED_TO") as any;
    expect(edge).toBeDefined();
    expect(edge.edge.from).toBe("domain:example.com");
    expect(edge.edge.to).toBe("org:Example Org");
  });

  test("maps social findings into Target + Account nodes and ASSOCIATED_WITH edge", () => {
    const sweep: SynintSweepResult = {
      target: "johndoe",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      agents: [
        {
          agentName: "SocialMediaAgent",
          success: true,
          findings: {
            accounts: [
              { platform: "twitter", handle: "johndoe", url: "https://twitter.com/johndoe", confidence: 0.9 }
            ]
          },
        },
      ],
    };

    const muts = mapper.toMutations(sweep);

    // Target node
    expect(muts.some(m => m.kind === "upsertNode" && m.node.id === "target:johndoe")).toBe(true);

    // Account node
    const accountNode = muts.find(m => m.kind === "upsertNode" && m.node.id === "acct:twitter:johndoe") as any;
    expect(accountNode).toBeDefined();
    expect(accountNode.node.labels).toContain("Account");
    expect(accountNode.node.props.url).toBe("https://twitter.com/johndoe");

    // Edge
    const edge = muts.find(m => m.kind === "upsertEdge" && m.edge.type === "ASSOCIATED_WITH") as any;
    expect(edge).toBeDefined();
    expect(edge.edge.from).toBe("target:johndoe");
    expect(edge.edge.to).toBe("acct:twitter:johndoe");
  });
});
