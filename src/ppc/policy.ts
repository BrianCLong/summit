import { buildGuard } from './guards';
import {
  Guard,
  GuardDefinition,
  GuardRuntimeState,
  GuardTrace,
  GuardViolation,
  Policy,
  PolicyExecution,
  PolicyExecutionOptions,
  PPCContext,
} from './types';

const cloneState = (state: GuardRuntimeState): GuardRuntimeState => ({
  prompt: state.prompt,
  response: state.response,
  tools: [...state.tools],
  metadata: { ...state.metadata },
});

const applyModifications = (
  state: GuardRuntimeState,
  modifications?: Partial<GuardRuntimeState>
): void => {
  if (!modifications) {
    return;
  }

  if (typeof modifications.prompt === 'string') {
    state.prompt = modifications.prompt;
  }

  if (typeof modifications.response === 'string') {
    state.response = modifications.response;
  }

  if (Array.isArray(modifications.tools)) {
    state.tools = [...modifications.tools];
  }

  if (modifications.metadata && typeof modifications.metadata === 'object') {
    state.metadata = {
      ...state.metadata,
      ...modifications.metadata,
    };
  }
};

class GuardPipeline implements Policy {
  public constructor(
    public readonly name: string,
    private readonly guards: Guard[]
  ) {}

  public async execute(
    context: PPCContext,
    options: PolicyExecutionOptions = {}
  ): Promise<PolicyExecution> {
    const state: GuardRuntimeState = {
      prompt: context.prompt,
      response: context.response,
      tools: [...(context.tools ?? [])],
      metadata: { ...(context.metadata ?? {}) },
    };

    const trace: GuardTrace[] = [];
    const violations: GuardViolation[] = [];
    let allowed = true;
    let blockedBy: string | undefined;

    for (let index = 0; index < this.guards.length; index += 1) {
      const guard = this.guards[index];
      const evaluation = await guard.evaluate(cloneState(state));
      trace.push({
        name: guard.name,
        kind: guard.kind,
        order: index,
        stage: guard.stage,
        triggered: evaluation.triggered,
        effect: evaluation.effect,
        description: evaluation.description,
        modifications: evaluation.modifications,
        score: evaluation.score,
        label: evaluation.label,
      });

      if (evaluation.triggered && evaluation.effect !== 'allow') {
        violations.push({
          name: guard.name,
          kind: guard.kind,
          stage: guard.stage,
          effect: evaluation.effect,
          description: evaluation.description,
          score: evaluation.score,
          label: evaluation.label,
        });
      }

      if (!options.dryRun) {
        applyModifications(state, evaluation.modifications);
      }

      if (evaluation.triggered && evaluation.effect === 'block') {
        allowed = false;
        blockedBy = guard.name;
        if (!options.dryRun) {
          break;
        }
      }
    }

    return {
      name: this.name,
      allowed,
      prompt: state.prompt,
      response: state.response,
      tools: state.tools,
      metadata: state.metadata,
      trace,
      blockedBy,
      violations,
    };
  }

  public dryRun(context: PPCContext): Promise<PolicyExecution> {
    return this.execute(context, { dryRun: true });
  }
}

export const instantiatePolicy = (
  name: string,
  definitions: GuardDefinition[]
): Policy => {
  const guards = definitions.map((definition) => buildGuard(definition));
  return new GuardPipeline(name, guards);
};
