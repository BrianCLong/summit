import { CooperationArtifact, TaskSpec } from '@ga-graphai/common-types';

import { GenerationInput, ResourceAdapter } from '../capabilityRegistry.js';
import { GuardedGenerator } from '../promptOps.js';

function extractCoveredCriteria(content: string, task: TaskSpec): Set<string> {
  const coverage = new Set<string>();
  task.acceptanceCriteria.forEach((criterion) => {
    if (new RegExp(criterion.id, 'i').test(content)) {
      coverage.add(criterion.id);
    }
  });
  return coverage;
}

export interface CounterfactualResult {
  artifact: CooperationArtifact;
  mergedCoverage: string[];
  shadowDeltas: string[];
}

export class CounterfactualShadowingCoordinator {
  private readonly guard = new GuardedGenerator();

  async run(
    task: TaskSpec,
    primary: ResourceAdapter,
    shadow: ResourceAdapter,
    adjudicator: ResourceAdapter,
  ): Promise<CounterfactualResult> {
    const primaryOutput = await primary.generate({
      task,
      strand: 'implementation',
      prompt: `Produce the best implementation plan for ${task.title}. Reference acceptance criteria IDs.`,
    } satisfies GenerationInput);
    const shadowOutput = await shadow.generate({
      task,
      strand: 'counterfactual',
      prompt: `Identify likely failure modes for ${task.title} and propose counterfactual mitigation steps aligned to acceptance criteria.`,
    } satisfies GenerationInput);

    const primaryCoverage = extractCoveredCriteria(primaryOutput.content, task);
    const shadowCoverage = extractCoveredCriteria(shadowOutput.content, task);

    const deltas = Array.from(shadowCoverage).filter(
      (id) => !primaryCoverage.has(id),
    );
    let mergedContent = primaryOutput.content;
    if (deltas.length > 0) {
      mergedContent += `\n\n[Counterfactual Enhancements]\n${shadowOutput.content}`;
    }

    const evaluation = adjudicator.evaluate
      ? await adjudicator.evaluate({
          mode: 'counterfactual-shadowing',
          content: mergedContent,
          supportingEvidence: [
            ...(primaryOutput.evidence ?? []),
            ...(shadowOutput.evidence ?? []),
          ],
          acceptanceCriteriaSatisfied: Array.from(
            new Set([...primaryCoverage, ...shadowCoverage]),
          ),
          residualRisks: [],
        })
      : [];

    const { artifact } = this.guard.enforce(
      'counterfactual-shadowing',
      mergedContent,
      evaluation ?? [],
      [...(primaryOutput.evidence ?? []), ...(shadowOutput.evidence ?? [])],
    );

    return {
      artifact,
      mergedCoverage: Array.from(
        new Set([...primaryCoverage, ...shadowCoverage]),
      ),
      shadowDeltas: deltas,
    };
  }
}
