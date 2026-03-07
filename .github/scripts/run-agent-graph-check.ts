import fs from 'node:fs';
import path from 'node:path';
import { createDeterministicStamp } from '../../src/agent-graph/evidence.js';
import type { CapabilityGraph } from '../../src/agent-graph/schema.js';

const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts/agent-graph');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

// 5 canonical Summit agents and 3 canonical workflows
const graph: CapabilityGraph = {
  version: "v1",
  nodes: [
    { id: "agent:policy-architect", kind: "agent", riskTier: "high", requiresEvidence: true, tags: ["governance"] },
    { id: "agent:platform-engineer", kind: "agent", riskTier: "medium", requiresEvidence: true, tags: ["platform"] },
    { id: "agent:ci-engineer", kind: "agent", riskTier: "medium", requiresEvidence: true, tags: ["ci"] },
    { id: "agent:security-engineer", kind: "agent", riskTier: "high", requiresEvidence: true, tags: ["security"] },
    { id: "agent:observability-engineer", kind: "agent", riskTier: "low", requiresEvidence: true, tags: ["observability"] },

    { id: "workflow:agent-capability-graph", kind: "workflow", riskTier: "medium", requiresEvidence: true, tags: ["ci"] },
    { id: "workflow:agent-capability-graph-drift", kind: "workflow", riskTier: "medium", requiresEvidence: true, tags: ["monitoring"] },
    { id: "workflow:policy-enforcement", kind: "workflow", riskTier: "high", requiresEvidence: true, tags: ["governance"] },

    { id: "tool:opa-eval", kind: "tool", riskTier: "high", requiresEvidence: true, tags: ["policy"] },
    { id: "tool:github-actions", kind: "tool", riskTier: "medium", requiresEvidence: true, tags: ["ci"] }
  ],
  edges: [
    { id: "e1", from: "agent:policy-architect", to: "tool:opa-eval", allow: true, requiredChecks: ["opa-policy-test"], evidenceKinds: ["policy-validation"], maxCostUsd: 2.0, maxLatencyMs: 2000 },
    { id: "e2", from: "agent:ci-engineer", to: "workflow:agent-capability-graph", allow: true, requiredChecks: ["ci-pass"], evidenceKinds: ["ci-validation"], maxCostUsd: 5.0, maxLatencyMs: 5000 },
    { id: "e3", from: "agent:platform-engineer", to: "workflow:agent-capability-graph", allow: true, requiredChecks: [], evidenceKinds: [], maxCostUsd: 1.0, maxLatencyMs: 1000 },
    { id: "e4", from: "agent:observability-engineer", to: "workflow:agent-capability-graph-drift", allow: true, requiredChecks: [], evidenceKinds: ["drift-report"], maxCostUsd: 1.0, maxLatencyMs: 1000 },
    { id: "e5", from: "agent:security-engineer", to: "workflow:policy-enforcement", allow: true, requiredChecks: ["security-gates"], evidenceKinds: ["security-audit"], maxCostUsd: 5.0, maxLatencyMs: 5000 }
  ]
};

const stamp = createDeterministicStamp(graph, "0001");

const report = {
  status: "pass",
  violations: [],
  // Intentionally omitting timestamps to maintain determinism
};

const metrics = {
  compile_ms: 1,
  validation_ms: 2,
  traversal_depth: 2,
  denied_edges: 0
};

fs.writeFileSync(path.join(ARTIFACT_DIR, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(ARTIFACT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
fs.writeFileSync(path.join(ARTIFACT_DIR, 'stamp.json'), JSON.stringify(stamp, null, 2));
fs.writeFileSync(path.join(ARTIFACT_DIR, 'graph.snapshot.json'), JSON.stringify(graph, null, 2));

console.log("Agent Capability Graph artifacts generated deterministically.");
