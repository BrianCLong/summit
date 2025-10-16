import { CooperationArtifact, TaskSpec } from '@ga-graphai/common-types';

import { GenerationInput, ResourceAdapter } from '../capabilityRegistry.js';
import { GuardedGenerator } from '../promptOps.js';

function crossEntropy(scores: number[]): number {
  const epsilon = 1e-6;
  if (scores.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const sum = scores.reduce(
    (acc, score) => acc + Math.log(Math.max(score, epsilon)),
    0,
  );
  return -sum / scores.length;
}

export interface CrossEntropySwapResult {
  artifact: CooperationArtifact;
  chosen: 'A' | 'B';
  entropyA: number;
  entropyB: number;
}

export class CrossEntropySwapCoordinator {
  private readonly guard = new GuardedGenerator();

  async adjudicate(
    task: TaskSpec,
    candidateA: ResourceAdapter,
    candidateB: ResourceAdapter,
    criticA: ResourceAdapter,
    criticB: ResourceAdapter,
  ): Promise<CrossEntropySwapResult> {
    const outputA = await candidateA.generate({
      task,
      strand: 'implementation',
      prompt: `Produce candidate solution A for ${task.title}.`,
    } satisfies GenerationInput);
    const outputB = await candidateB.generate({
      task,
      strand: 'implementation',
      prompt: `Produce candidate solution B for ${task.title}.`,
    } satisfies GenerationInput);

    const critiqueAonB = criticA.critique
      ? await criticA.critique({
          mode: 'cross-entropy-swaps',
          content: outputB.content,
          supportingEvidence: outputB.evidence ?? [],
          acceptanceCriteriaSatisfied: [],
          residualRisks: [],
        })
      : [];
    const critiqueBonA = criticB.critique
      ? await criticB.critique({
          mode: 'cross-entropy-swaps',
          content: outputA.content,
          supportingEvidence: outputA.evidence ?? [],
          acceptanceCriteriaSatisfied: [],
          residualRisks: [],
        })
      : [];

    const entropyA = crossEntropy(
      (critiqueBonA ?? []).map((score) => score.score),
    );
    const entropyB = crossEntropy(
      (critiqueAonB ?? []).map((score) => score.score),
    );

    const chosenOutput = entropyA <= entropyB ? outputA : outputB;
    const chosen = entropyA <= entropyB ? 'A' : 'B';
    const { artifact } = this.guard.enforce(
      'cross-entropy-swaps',
      chosenOutput.content,
      [],
      chosenOutput.evidence ?? [],
    );

    return { artifact, chosen, entropyA, entropyB };
  }
}
