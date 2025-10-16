import {
  CapabilityProfile,
  CooperationArtifact,
  EvaluatorScore,
  PolicyMetadata,
  RouterBid,
  TaskSpec,
  WorkbookCommand,
  WorkbookReceipt,
} from '@ga-graphai/common-types';

export interface GenerationInput {
  task: TaskSpec;
  strand?:
    | 'spec'
    | 'risks'
    | 'tests'
    | 'implementation'
    | 'counterfactual'
    | 'challenge';
  prompt: string;
  context?: Record<string, unknown>;
}

export interface GenerationOutput {
  content: string;
  evidence?: CooperationArtifact['supportingEvidence'];
  scores?: EvaluatorScore[];
  residualRisks?: string[];
}

export interface ResourceAdapter {
  profile: CapabilityProfile;
  bid(task: TaskSpec): RouterBid;
  generate(
    input: GenerationInput,
  ): Promise<GenerationOutput> | GenerationOutput;
  critique?(
    artifact: CooperationArtifact,
  ): Promise<EvaluatorScore[]> | EvaluatorScore[];
  evaluate?(
    artifact: CooperationArtifact,
  ): Promise<EvaluatorScore[]> | EvaluatorScore[];
  runWorkbook?(
    commands: WorkbookCommand[],
  ): Promise<WorkbookReceipt> | WorkbookReceipt;
}

export class CapabilityRegistry {
  private readonly resources = new Map<string, ResourceAdapter>();

  register(resource: ResourceAdapter): void {
    this.resources.set(resource.profile.id, resource);
  }

  unregister(id: string): void {
    this.resources.delete(id);
  }

  get(id: string): ResourceAdapter | undefined {
    return this.resources.get(id);
  }

  list(): ResourceAdapter[] {
    return Array.from(this.resources.values());
  }

  eligible(policy: PolicyMetadata): ResourceAdapter[] {
    return this.list().filter((resource) =>
      this.satisfiesPolicy(resource.profile, policy),
    );
  }

  private satisfiesPolicy(
    profile: CapabilityProfile,
    policy: PolicyMetadata,
  ): boolean {
    if (
      policy.residency &&
      profile.residency !== 'global' &&
      profile.residency !== policy.residency
    ) {
      return false;
    }
    if (policy.pii && profile.safety === 'low') {
      return false;
    }
    if (policy.safetyTier === 'high' && profile.safety !== 'high') {
      return false;
    }
    return true;
  }
}
