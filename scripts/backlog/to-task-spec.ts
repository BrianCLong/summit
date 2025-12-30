import fs from 'fs';
import path from 'path';

interface BacklogItem {
  item_id: string;
  title?: string;
  description?: string;
  category: string;
  affected_domains: string[];
  estimated_effort: number;
  estimated_risk_reduction: number;
  urgency: { time_criticality: number; rationale: string; due_date?: string };
  dependencies: string[];
  verification_requirements: { required_tier: string; tests?: string[]; evidence: string[] };
  eligible_agents: string[];
  suggested_playbook?: string;
  source_signals: Array<{ id: string; type: string; severity: string; evidence?: string }>;
  metadata?: { budget_impact?: { risk?: number; debt?: number } };
  priority_band?: string;
  priority_score?: number;
}

interface BacklogSnapshot {
  generated_at: string;
  items: BacklogItem[];
}

interface TaskSpec {
  item_id: string;
  agent_id?: string;
  priority_band: string;
  priority_score?: number;
  contract: {
    category: string;
    scope: string[];
    dependencies: string[];
    urgency: { time_criticality: number; due_date?: string; rationale: string };
  };
  budgets: {
    risk_budget_cost: number;
    debt_budget_cost: number;
    effort_estimate: number;
  };
  verification: BacklogItem['verification_requirements'];
  success_criteria: {
    risk_reduction_target: number;
    evidence: string[];
    tests?: string[];
  };
  provenance: {
    snapshot_source: string;
    generated_at: string;
    source_signals: BacklogItem['source_signals'];
  };
  prompt_lock: {
    title?: string;
    description?: string;
    suggested_playbook?: string;
    eligible_agents: string[];
  };
}

function loadSnapshot(filePath: string): BacklogSnapshot {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BacklogSnapshot;
}

function buildTaskSpec(item: BacklogItem, snapshotPath: string, agentId?: string): TaskSpec {
  const riskBudgetCost = item.metadata?.budget_impact?.risk ?? 0;
  const debtBudgetCost = item.metadata?.budget_impact?.debt ?? 0;

  return {
    item_id: item.item_id,
    agent_id: agentId,
    priority_band: item.priority_band ?? 'P3',
    priority_score: item.priority_score,
    contract: {
      category: item.category,
      scope: item.affected_domains,
      dependencies: item.dependencies,
      urgency: item.urgency,
    },
    budgets: {
      risk_budget_cost: riskBudgetCost,
      debt_budget_cost: debtBudgetCost,
      effort_estimate: item.estimated_effort,
    },
    verification: item.verification_requirements,
    success_criteria: {
      risk_reduction_target: item.estimated_risk_reduction,
      evidence: item.verification_requirements.evidence,
      tests: item.verification_requirements.tests,
    },
    provenance: {
      snapshot_source: snapshotPath,
      generated_at: new Date().toISOString(),
      source_signals: item.source_signals,
    },
    prompt_lock: {
      title: item.title,
      description: item.description,
      suggested_playbook: item.suggested_playbook,
      eligible_agents: item.eligible_agents,
    },
  };
}

async function main() {
  const itemFlagIndex = process.argv.indexOf('--item');
  const snapshotFlagIndex = process.argv.indexOf('--snapshot');
  const agentFlagIndex = process.argv.indexOf('--agent');

  const itemId = itemFlagIndex >= 0 ? process.argv[itemFlagIndex + 1] : undefined;
  const snapshotPath = snapshotFlagIndex >= 0 ? process.argv[snapshotFlagIndex + 1] : 'artifacts/backlog/backlog-snapshot.json';
  const agentId = agentFlagIndex >= 0 ? process.argv[agentFlagIndex + 1] : undefined;

  if (!itemId) {
    console.error('Usage: tsx scripts/backlog/to-task-spec.ts --item <ID> [--snapshot path] [--agent AGENT] [--out dir]');
    process.exit(1);
  }

  const outDirIndex = process.argv.indexOf('--out');
  const outDir = outDirIndex >= 0 ? process.argv[outDirIndex + 1] : 'artifacts/backlog-decisions';

  const snapshot = loadSnapshot(snapshotPath);
  const item = snapshot.items.find((entry) => entry.item_id === itemId);

  if (!item) {
    console.error(`Backlog item ${itemId} not found in ${snapshotPath}`);
    process.exit(1);
  }

  const spec = buildTaskSpec(item, snapshotPath, agentId);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${item.item_id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(spec, null, 2));
  console.log(`Task spec written to ${outPath}`);
}

void main();
