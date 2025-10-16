import { CooperationArtifact, TaskSpec } from '@ga-graphai/common-types';

import { GenerationInput, ResourceAdapter } from '../capabilityRegistry.js';
import { GuardedGenerator } from '../promptOps.js';

function parseChallenges(content: string): string[] {
  return content
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export interface ChallengeResult {
  artifact: CooperationArtifact;
  passedChallenges: string[];
  failedChallenges: string[];
}

export class CausalChallengeGamesCoordinator {
  private readonly guard = new GuardedGenerator();

  async run(
    task: TaskSpec,
    proposer: ResourceAdapter,
    challenger: ResourceAdapter,
    repairer: ResourceAdapter,
  ): Promise<ChallengeResult> {
    const base = await proposer.generate({
      task,
      strand: 'implementation',
      prompt: `Propose solution for ${task.title} honoring all acceptance criteria.`,
    } satisfies GenerationInput);

    const challengesOutput = await challenger.generate({
      task,
      strand: 'challenge',
      prompt: `Craft minimal counter-examples or stress cases for proposal: ${base.content}`,
    } satisfies GenerationInput);

    const challenges = parseChallenges(challengesOutput.content);
    const failed: string[] = [];
    const passed: string[] = [];
    let revisedContent = base.content;

    for (const challenge of challenges) {
      if (new RegExp(challenge, 'i').test(base.content)) {
        passed.push(challenge);
        continue;
      }
      failed.push(challenge);
      const repaired = await repairer.generate({
        task,
        strand: 'implementation',
        prompt: `Repair solution to handle challenge: ${challenge}. Base: ${revisedContent}`,
      } satisfies GenerationInput);
      revisedContent = repaired.content;
    }

    const { artifact } = this.guard.enforce(
      'causal-challenge-games',
      revisedContent,
      [],
      [...(base.evidence ?? []), ...(challengesOutput.evidence ?? [])],
    );

    return {
      artifact,
      passedChallenges: passed,
      failedChallenges: failed,
    };
  }
}
