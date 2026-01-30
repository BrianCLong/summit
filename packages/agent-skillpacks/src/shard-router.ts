import { ShardRoutingContext, ShardSelection } from './types.js';

export const selectShard = (
  shards: Record<string, string[]>,
  context: ShardRoutingContext
): ShardSelection => {
  const reasons: string[] = [];
  const available = new Set(Object.keys(shards));

  const pick = (shard: string, reason: string): ShardSelection => {
    reasons.push(reason);
    return { shard, reasons };
  };

  if (context.governanceMode === 'ci' && available.has('ci')) {
    return pick('ci', 'Governance mode is CI.');
  }

  if (typeof context.intentDepthOrder === 'number') {
    if (context.intentDepthOrder >= 23 && available.has('deep')) {
      return pick('deep', 'Intent depth order ≥ 23 routed to deep shard.');
    }
    if (context.intentDepthOrder >= 15 && available.has('review')) {
      return pick('review', 'Intent depth order ≥ 15 routed to review shard.');
    }
    if (context.intentDepthOrder >= 8 && available.has('plan')) {
      return pick('plan', 'Intent depth order ≥ 8 routed to plan shard.');
    }
  }

  if (context.taskType === 'review' && available.has('review')) {
    return pick('review', 'Task type is review.');
  }

  if (context.taskType === 'plan' && available.has('plan')) {
    return pick('plan', 'Task type is plan.');
  }

  if (context.taskType === 'implement' && available.has('deep')) {
    return pick('deep', 'Task type is implement; deep shard available.');
  }

  if (
    typeof context.contextBudgetTokens === 'number' &&
    context.contextBudgetTokens < 4000 &&
    available.has('minimal')
  ) {
    return pick('minimal', 'Context budget constrained.');
  }

  if (context.repoArea === 'security' && available.has('security')) {
    return pick('security', 'Repo area flagged for security.');
  }

  if (available.has('default')) {
    return pick('default', 'Default shard selected.');
  }

  const [first] = Object.keys(shards);
  return pick(first, 'Fallback to first shard.');
};
