#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { triageAgent } from "../agents/triageAgent";
import { readinessAgent } from "../agents/readinessAgent";
import { architectureDriftAgent } from "../agents/architectureDriftAgent";
import { securityPostureAgent } from "../agents/securityPostureAgent";
import { observabilityRollupAgent } from "../agents/observabilityRollupAgent";

type AgentFn = () => Promise<void>;

const agents: Record<string, AgentFn> = {
  triageAgent,
  readinessAgent,
  architectureDriftAgent,
  securityPostureAgent,
  observabilityRollupAgent,
};

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const agentName = getArg("agent");
  if (!agentName || !agents[agentName]) {
    throw new Error(`Unknown or missing agent: ${agentName}`);
  }

  fs.mkdirSync(path.resolve(".summit-out"), { recursive: true });
  await agents[agentName]();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
