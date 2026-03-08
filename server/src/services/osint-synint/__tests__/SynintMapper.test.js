"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SynintMapper_js_1 = require("../SynintMapper.js");
(0, globals_1.describe)("SynintMapper", () => {
    (0, globals_1.it)("maps whois findings into Domain + REGISTERED_TO", () => {
        const mapper = new SynintMapper_js_1.SynintMapper({ sourceTag: "synint" });
        const muts = mapper.toMutations({
            target: "example.com",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            agents: [
                { agentName: "WhoisAgent", success: true, findings: { domain: "example.com", registrantOrg: "Example Org" } },
            ],
        });
        const hasDomain = muts.some(m => m.kind === "upsertNode" && m.node.id === "domain:example.com");
        (0, globals_1.expect)(hasDomain).toBe(true);
        const hasEdge = muts.some(m => m.kind === "upsertEdge" && m.edge.type === "REGISTERED_TO");
        (0, globals_1.expect)(hasEdge).toBe(true);
    });
});
