import {
  type SkillpackDefinition,
  type TaskContext,
} from './types';

export interface ShardSelection {
  shard: string;
  reasoning: string[];
}

export function selectShard(
  skillpack: SkillpackDefinition,
  context: TaskContext,
): ShardSelection {
  const reasoning: string[] = [];
  const availableShards = new Set<string>([
    ...Object.keys(skillpack.shardHints),
    'default',
  ]);

  let chosen = 'default';

  if (context.governanceMode === 'ci' && availableShards.has('ci')) {
    chosen = 'ci';
    reasoning.push('CI mode enforces ci shard.');
  }

  if (context.repoFocus === 'security' && availableShards.has('security')) {
    chosen = 'security';
    reasoning.push('Security focus selects security shard.');
  }

  if (context.taskType === 'review' && availableShards.has('deep')) {
    chosen = 'deep';
    reasoning.push('Review task selects deep shard.');
  }

  if (context.remainingBudget < context.contextBudget * 0.3) {
    if (availableShards.has('default')) {
      chosen = 'default';
      reasoning.push('Context budget low; default shard enforced.');
    }
  }

  if (!availableShards.has(chosen)) {
    chosen = 'default';
    reasoning.push('Fallback to default shard.');
  }

  return { shard: chosen, reasoning };
}
