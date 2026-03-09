#!/usr/bin/env node

import { triageAgent } from "../agents/triageAgent";
import { readinessAgent } from "../agents/readinessAgent";
import { architectureDriftAgent } from "../agents/architectureDriftAgent";
import { securityPostureAgent } from "../agents/securityPostureAgent";
import { observabilityRollupAgent } from "../agents/observabilityRollupAgent";

import fs from "node:fs";
import path from "node:path";

type AgentFn = () => Promise<void>;

const agents: Record<string, AgentFn> = {
  triageAgent,
  readinessAgent,
  architectureDriftAgent,
  securityPostureAgent,
  observabilityRollupAgent,
};

function getArg(name: string): string {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? (process.argv[idx + 1] || "") : "";
}

async function main() {
  const agentName = getArg("--agent");
  if (!agentName) throw new Error("Missing required --agent");

  const agent = agents[agentName];
  if (!agent) throw new Error(`Unknown agent: ${agentName}`);

  fs.mkdirSync(path.resolve(".summit-out"), { recursive: true });

  await agent();
}

main().catch((err) => {
  console.error(err);
  try {
    fs.mkdirSync(path.resolve(".summit-out"), { recursive: true });
    fs.writeFileSync(
      path.join(path.resolve(".summit-out"), "summary.md"),
      `## Summit agent error\n\n` + String(err?.message || err),
      "utf8"
    );
  } catch (e) {
    console.error(e);
  }

  process.exit(1);
});
