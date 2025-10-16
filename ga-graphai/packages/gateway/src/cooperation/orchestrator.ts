import {
  CooperationArtifact,
  RoutingDecision,
  TaskSpec,
} from '@ga-graphai/common-types';
import { ProvenanceLedger } from '@ga-graphai/prov-ledger';

import { CapabilityRegistry, ResourceAdapter } from '../capabilityRegistry.js';
import { GuardedGenerator } from '../promptOps.js';
import { CounterfactualShadowingCoordinator } from './counterfactualShadowing.js';
import { CausalChallengeGamesCoordinator } from './causalChallengeGames.js';
import { CrossEntropySwapCoordinator } from './crossEntropySwaps.js';
import { ProofOfUsefulWorkbookCoordinator } from './proofOfUsefulWorkbook.js';
import { SemanticBraidCoordinator } from './semanticBraid.js';

function ensureResource(
  id: string,
  registry: CapabilityRegistry,
): ResourceAdapter {
  const resource = registry.get(id);
  if (!resource) {
    throw new Error(`Resource ${id} not registered`);
  }
  return resource;
}

function collectResources(
  ids: string[],
  registry: CapabilityRegistry,
): ResourceAdapter[] {
  return ids.map((id) => ensureResource(id, registry));
}

export interface ExecutionResult {
  artifact: CooperationArtifact;
  decision: RoutingDecision;
}

export class CooperationOrchestrator {
  private readonly braid = new SemanticBraidCoordinator();
  private readonly shadow = new CounterfactualShadowingCoordinator();
  private readonly challenges = new CausalChallengeGamesCoordinator();
  private readonly swaps = new CrossEntropySwapCoordinator();
  private readonly workbook = new ProofOfUsefulWorkbookCoordinator();
  private readonly guard = new GuardedGenerator();

  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly ledger: ProvenanceLedger,
  ) {}

  async execute(
    task: TaskSpec,
    decision: RoutingDecision,
  ): Promise<ExecutionResult> {
    const resources = collectResources(
      [...decision.primaryAssignments, ...decision.supportAssignments],
      this.registry,
    );
    if (resources.length === 0) {
      throw new Error('No resources available for cooperation');
    }

    let artifact: CooperationArtifact;
    switch (decision.mode) {
      case 'semantic-braid': {
        const assignments = new Map();
        const order: ('spec' | 'risks' | 'tests' | 'implementation')[] = [
          'spec',
          'tests',
          'risks',
          'implementation',
        ];
        order.forEach((strand, index) => {
          assignments.set(strand, resources[index % resources.length]);
        });
        const result = await this.braid.weave(task, assignments);
        artifact = result.artifact;
        break;
      }
      case 'counterfactual-shadowing': {
        const primary = resources[0];
        const shadow = resources[1] ?? resources[0];
        const adjudicator = resources[2] ?? resources[0];
        const result = await this.shadow.run(
          task,
          primary,
          shadow,
          adjudicator,
        );
        artifact = result.artifact;
        break;
      }
      case 'causal-challenge-games': {
        const proposer = resources[0];
        const challenger = resources[1] ?? resources[0];
        const repairer = resources[2] ?? resources[0];
        const result = await this.challenges.run(
          task,
          proposer,
          challenger,
          repairer,
        );
        artifact = result.artifact;
        break;
      }
      case 'cross-entropy-swaps': {
        const candidateA = resources[0];
        const candidateB = resources[1] ?? resources[0];
        const criticA = resources[2] ?? candidateA;
        const criticB = resources[3] ?? candidateB;
        const result = await this.swaps.adjudicate(
          task,
          candidateA,
          candidateB,
          criticA,
          criticB,
        );
        artifact = result.artifact;
        break;
      }
      case 'proof-of-useful-workbook': {
        const result = await this.workbook.execute(task, resources[0]);
        artifact = result.artifact;
        break;
      }
      case 'federated-deliberation': {
        const votes = await Promise.all(
          resources.map(async (resource) => {
            const output = await resource.generate({
              task,
              strand: 'implementation',
              prompt: `Provide a localized recommendation for ${task.title}.`,
            });
            return {
              resource,
              weight: resource.profile.reliabilityScore,
              content: output.content,
            };
          }),
        );
        const aggregate = votes
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)
          .map(
            (vote) =>
              `(${vote.weight.toFixed(2)}) ${vote.resource.profile.id}: ${vote.content}`,
          )
          .join('\n');
        artifact = this.guard.enforce(
          'federated-deliberation',
          aggregate,
        ).artifact;
        break;
      }
      case 'auction-of-experts':
      default: {
        const outputs = await Promise.all(
          resources.map((resource) =>
            resource.generate({
              task,
              strand: 'implementation',
              prompt: `Provide contribution aligned to skills ${resource.profile.skills.join(', ')} for ${task.title}.`,
            }),
          ),
        );
        const combined = outputs
          .map(
            (output, index) =>
              `Contributor ${resources[index].profile.id}: ${output.content}`,
          )
          .join('\n');
        artifact = this.guard.enforce('auction-of-experts', combined).artifact;
        break;
      }
    }

    this.ledger.append({
      reqId: task.taskId,
      step: 'generator',
      input: { taskId: task.taskId, decision },
      output: artifact,
      modelId: `cooperation-${decision.mode}`,
      ckpt: 'n/a',
      prompt: 'cooperation-execution',
      params: { mode: decision.mode },
      policy: task.policy,
      tags: task.policyTags,
    });

    return { artifact, decision };
  }
}
