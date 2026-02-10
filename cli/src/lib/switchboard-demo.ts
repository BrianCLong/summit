/**
 * Switchboard Demo Runner
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import {
  findSwitchboardTool,
  getSwitchboardRegistryStats,
  loadSwitchboardRegistry,
  type SwitchboardRegistryToolRef,
} from './switchboard-registry.js';

const DemoPolicySchema = z.object({
  version: z.string().min(1),
  name: z.string().optional(),
  allow_tools: z.array(z.string()),
});

const DEMO_TOOL_ID = 'demo.echo';
const DEMO_TIMESTAMP = '2026-02-11T00:00:00.000Z';

export interface SwitchboardDemoPaths {
  registryPath: string;
  denyPolicyPath: string;
  allowPolicyPath: string;
}

export interface SwitchboardDemoResult {
  registryStats: {
    servers: number;
    tools: number;
    capabilities: number;
  };
  denyReason: string;
  allowTool: SwitchboardRegistryToolRef;
  receiptPath: string;
  eventsPath: string;
}

function loadDemoPolicy(policyPath: string): z.infer<typeof DemoPolicySchema> {
  const contents = fs.readFileSync(policyPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Policy JSON parse failed for ${policyPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const validation = DemoPolicySchema.safeParse(parsed);
  if (!validation.success) {
    const issues = validation.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Policy validation failed for ${policyPath}:\n${issues.join('\n')}`);
  }

  return validation.data;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath: string, payload: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeJsonLines(filePath: string, entries: unknown[]): void {
  const lines = entries.map((entry) => JSON.stringify(entry));
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function evaluatePolicy(policy: z.infer<typeof DemoPolicySchema>, toolId: string): {
  allow: boolean;
  reason: string;
} {
  if (policy.allow_tools.includes(toolId)) {
    return { allow: true, reason: 'allowlist-match' };
  }
  return { allow: false, reason: 'deny-by-default' };
}

function defaultDemoPaths(repoRoot: string): SwitchboardDemoPaths {
  return {
    registryPath: path.join(repoRoot, 'fixtures', 'registry.demo.json'),
    denyPolicyPath: path.join(repoRoot, 'fixtures', 'policy.deny-all.json'),
    allowPolicyPath: path.join(repoRoot, 'fixtures', 'policy.allow-demo.json'),
  };
}

export function runSwitchboardDemo(repoRoot: string, paths?: Partial<SwitchboardDemoPaths>): SwitchboardDemoResult {
  const resolvedPaths = { ...defaultDemoPaths(repoRoot), ...paths };
  const registry = loadSwitchboardRegistry(resolvedPaths.registryPath);
  const registryStats = getSwitchboardRegistryStats(registry);

  console.log(
    `REGISTRY PASS (servers=${registryStats.servers}, tools=${registryStats.tools}, capabilities=${registryStats.capabilities})`
  );
  console.log(`ROUTING ATTEMPT (tool=${DEMO_TOOL_ID})`);

  const denyPolicy = loadDemoPolicy(resolvedPaths.denyPolicyPath);
  const denyDecision = evaluatePolicy(denyPolicy, DEMO_TOOL_ID);
  if (denyDecision.allow) {
    throw new Error(`Expected deny policy to block ${DEMO_TOOL_ID}`);
  }
  console.log(`POLICY DENY (reason=${denyDecision.reason})`);

  const allowPolicy = loadDemoPolicy(resolvedPaths.allowPolicyPath);
  const allowDecision = evaluatePolicy(allowPolicy, DEMO_TOOL_ID);
  if (!allowDecision.allow) {
    throw new Error(`Expected allow policy to permit ${DEMO_TOOL_ID}`);
  }

  const toolRef = findSwitchboardTool(registry, DEMO_TOOL_ID);
  if (!toolRef) {
    throw new Error(`Tool not found in registry: ${DEMO_TOOL_ID}`);
  }
  console.log(`POLICY ALLOW (tool=${toolRef.tool.id}, server=${toolRef.server.id})`);

  const demoDir = path.join(repoRoot, '.switchboard', 'demo');
  const receiptsDir = path.join(demoDir, 'receipts');
  ensureDir(receiptsDir);

  const receiptPath = path.join(receiptsDir, 'demo-receipt.json');
  const eventsPath = path.join(demoDir, 'events.jsonl');

  const outputPayload = {
    payload: 'demo-output',
    ok: true,
  };
  const receipt = {
    id: 'receipt-demo-0001',
    tool_id: toolRef.tool.id,
    server_id: toolRef.server.id,
    status: 'allowed',
    output: outputPayload,
    timestamp: DEMO_TIMESTAMP,
  };
  const events = [
    {
      type: 'registry_validated',
      tool_count: registryStats.tools,
      timestamp: DEMO_TIMESTAMP,
    },
    {
      type: 'policy_denied',
      tool_id: DEMO_TOOL_ID,
      reason: denyDecision.reason,
      timestamp: DEMO_TIMESTAMP,
    },
    {
      type: 'policy_allowed',
      tool_id: toolRef.tool.id,
      server_id: toolRef.server.id,
      reason: allowDecision.reason,
      timestamp: DEMO_TIMESTAMP,
    },
    {
      type: 'tool_stubbed',
      tool_id: toolRef.tool.id,
      output: outputPayload,
      timestamp: DEMO_TIMESTAMP,
    },
  ];

  writeJson(receiptPath, receipt);
  writeJsonLines(eventsPath, events);

  console.log(`RECEIPT WRITTEN (${receiptPath})`);
  console.log(`EVENTS WRITTEN (${eventsPath})`);

  return {
    registryStats,
    denyReason: denyDecision.reason,
    allowTool: toolRef,
    receiptPath,
    eventsPath,
  };
}
