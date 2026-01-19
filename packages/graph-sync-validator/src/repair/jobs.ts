import crypto from 'node:crypto';
import neo4j from 'neo4j-driver';
import { RepairAction } from './planner.js';

function actionKey(action: RepairAction): string {
  return JSON.stringify(action);
}

function shouldApply(action: RepairAction, canaryPct: number): boolean {
  if (canaryPct <= 0) {
    return true;
  }
  const hash = crypto
    .createHash('sha256')
    .update(actionKey(action))
    .digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket < canaryPct;
}

export async function applyRepairPlan(args: {
  neo4jUri: string;
  neo4jUser: string;
  neo4jPass: string;
  actions: RepairAction[];
  dryRun: boolean;
  canaryPct: number;
  allowRepair: boolean;
}): Promise<{ applied: number; skipped: number }> {
  if (!args.allowRepair) {
    throw new Error('Repair blocked: set ALLOW_GRAPH_REPAIR=1 to enable writes.');
  }
  if (args.dryRun) {
    return { applied: 0, skipped: args.actions.length };
  }

  const driver = neo4j.driver(
    args.neo4jUri,
    neo4j.auth.basic(args.neo4jUser, args.neo4jPass),
  );
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });

  let applied = 0;
  let skipped = 0;

  try {
    for (const action of args.actions) {
      if (!shouldApply(action, args.canaryPct)) {
        skipped += 1;
        continue;
      }

      if (action.kind === 'UPSERT_NODE') {
        const labels = action.labels.map((label) => `\`${label}\``).join(':');
        const query = `
          MERGE (n:${labels} { id: $id })
          SET n += $props
          RETURN n
        `;
        await session.run(query, { id: action.id, props: action.props });
        applied += 1;
        continue;
      }

      if (action.kind === 'DELETE_NODE') {
        const query = 'MATCH (n { id: $id }) DETACH DELETE n';
        await session.run(query, { id: action.id });
        applied += 1;
        continue;
      }

      if (action.kind === 'UPSERT_EDGE') {
        const query = `
          MATCH (a { id: $fromId })
          MATCH (b { id: $toId })
          MERGE (a)-[r:\`${action.rel}\`]->(b)
          RETURN r
        `;
        await session.run(query, { fromId: action.fromId, toId: action.toId });
        applied += 1;
        continue;
      }

      if (action.kind === 'DELETE_EDGE') {
        const query = `
          MATCH (a { id: $fromId })-[r:\`${action.rel}\`]->(b { id: $toId })
          DELETE r
        `;
        await session.run(query, { fromId: action.fromId, toId: action.toId });
        applied += 1;
        continue;
      }
    }

    return { applied, skipped };
  } finally {
    await session.close();
    await driver.close();
  }
}
