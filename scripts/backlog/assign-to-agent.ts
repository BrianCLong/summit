import fs from 'fs';
import path from 'path';
import { load as loadYaml } from 'js-yaml';

interface AssignmentRequest {
  item_id: string;
  agent_id: string;
}

interface AgentConfig {
  id: string;
  categories: string[];
  domains: string[];
  verification_tiers: string[];
  risk_budget: number;
  debt_budget: number;
}

interface BacklogSnapshot {
  generated_at: string;
  weights_version: number;
  items: Array<BacklogItem & { priority_score: number; priority_band: string }>;
}

interface BacklogItem {
  item_id: string;
  category: string;
  affected_domains: string[];
  verification_requirements: { required_tier: string };
  eligible_agents: string[];
  metadata?: { budget_impact?: { risk?: number; debt?: number } };
}

interface AssignmentDecision {
  item_id: string;
  agent_id: string;
  approved: boolean;
  reason: string;
  verification_tier: string;
  risk_budget_used: number;
  debt_budget_used: number;
}

function loadAgents(filePath: string): AgentConfig[] {
  const parsed = loadYaml(fs.readFileSync(filePath, 'utf-8')) as { agents: AgentConfig[] };
  return parsed.agents;
}

function loadSnapshot(filePath: string): BacklogSnapshot {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BacklogSnapshot;
}

function validateAssignment(item: BacklogItem, agent: AgentConfig): AssignmentDecision {
  if (!item.eligible_agents.includes(agent.id)) {
    return {
      item_id: item.item_id,
      agent_id: agent.id,
      approved: false,
      reason: 'Agent not eligible for this item',
      verification_tier: item.verification_requirements.required_tier,
      risk_budget_used: 0,
      debt_budget_used: 0,
    };
  }

  if (!agent.categories.includes(item.category)) {
    return {
      item_id: item.item_id,
      agent_id: agent.id,
      approved: false,
      reason: 'Agent category scope mismatch',
      verification_tier: item.verification_requirements.required_tier,
      risk_budget_used: 0,
      debt_budget_used: 0,
    };
  }

  const domainOverlap = item.affected_domains.some((domain) => agent.domains.includes(domain));
  if (!domainOverlap) {
    return {
      item_id: item.item_id,
      agent_id: agent.id,
      approved: false,
      reason: 'No domain overlap between agent and item',
      verification_tier: item.verification_requirements.required_tier,
      risk_budget_used: 0,
      debt_budget_used: 0,
    };
  }

  if (!agent.verification_tiers.includes(item.verification_requirements.required_tier)) {
    return {
      item_id: item.item_id,
      agent_id: agent.id,
      approved: false,
      reason: 'Agent lacks required verification tier',
      verification_tier: item.verification_requirements.required_tier,
      risk_budget_used: 0,
      debt_budget_used: 0,
    };
  }

  const riskCost = item.metadata?.budget_impact?.risk ?? 0;
  const debtCost = item.metadata?.budget_impact?.debt ?? 0;

  if (riskCost > agent.risk_budget) {
    return {
      item_id: item.item_id,
      agent_id: agent.id,
      approved: false,
      reason: 'Risk budget exceeded',
      verification_tier: item.verification_requirements.required_tier,
      risk_budget_used: riskCost,
      debt_budget_used: debtCost,
    };
  }

  if (debtCost > agent.debt_budget) {
    return {
      item_id: item.item_id,
      agent_id: agent.id,
      approved: false,
      reason: 'Debt budget exceeded',
      verification_tier: item.verification_requirements.required_tier,
      risk_budget_used: riskCost,
      debt_budget_used: debtCost,
    };
  }

  return {
    item_id: item.item_id,
    agent_id: agent.id,
    approved: true,
    reason: 'Validated within scope, budget, and verification tier',
    verification_tier: item.verification_requirements.required_tier,
    risk_budget_used: riskCost,
    debt_budget_used: debtCost,
  };
}

function writeDecision(decision: AssignmentDecision, outputDir: string) {
  const outPath = path.join(outputDir, `${decision.item_id}-assignment.json`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(decision, null, 2));
  console.log(`Assignment decision written to ${outPath}`);
}

async function main() {
  const itemFlagIndex = process.argv.indexOf('--item');
  const agentFlagIndex = process.argv.indexOf('--agent');
  const itemId = itemFlagIndex >= 0 ? process.argv[itemFlagIndex + 1] : undefined;
  const agentId = agentFlagIndex >= 0 ? process.argv[agentFlagIndex + 1] : undefined;

  if (!itemId || !agentId) {
    console.error('Usage: tsx scripts/backlog/assign-to-agent.ts --item <ID> --agent <AGENT> [--snapshot path] [--agents path] [--out dir]');
    process.exit(1);
  }

  const snapshotPath = process.argv.includes('--snapshot')
    ? process.argv[process.argv.indexOf('--snapshot') + 1]
    : 'artifacts/backlog/backlog-snapshot.json';
  const agentsPath = process.argv.includes('--agents')
    ? process.argv[process.argv.indexOf('--agents') + 1]
    : 'backlog/agents.yaml';
  const outDir = process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : 'artifacts/backlog-decisions';

  const snapshot = loadSnapshot(snapshotPath);
  const agent = loadAgents(agentsPath).find((a) => a.id === agentId);
  const item = snapshot.items.find((entry) => entry.item_id === itemId);

  if (!agent) {
    console.error(`Agent ${agentId} not found in ${agentsPath}`);
    process.exit(1);
  }

  if (!item) {
    console.error(`Backlog item ${itemId} not found in ${snapshotPath}`);
    process.exit(1);
  }

  const decision = validateAssignment(item, agent);
  writeDecision(decision, outDir);
}

void main();
