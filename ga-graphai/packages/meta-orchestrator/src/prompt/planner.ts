interface PlannerModuleState {
  weight: number;
  successes: number;
  invocations: number;
}

export interface PromptModuleContext {
  task: string;
  complexity: number;
  [key: string]: unknown;
}

export interface PromptModule {
  name: string;
  template: (context: PromptModuleContext) => string;
  estimatedTokens: number;
  minComplexity?: number;
  maxComplexity?: number;
}

export interface PlannerFeedback {
  module: string;
  score: number;
  tokenCost: number;
}

export interface PlannerOptions {
  modules: PromptModule[];
  tokenBudget: number;
  learningRate?: number;
}

export interface PlannedPrompt {
  modules: string[];
  prompt: string;
  estimatedTokens: number;
}

const DEFAULT_LEARNING_RATE = 0.2;

export class MetaPromptPlanner {
  private readonly modules: PromptModule[];
  private readonly tokenBudget: number;
  private readonly learningRate: number;
  private readonly state: Map<string, PlannerModuleState> = new Map();

  constructor(options: PlannerOptions) {
    this.modules = options.modules;
    this.tokenBudget = options.tokenBudget;
    this.learningRate = options.learningRate ?? DEFAULT_LEARNING_RATE;
    for (const module of this.modules) {
      this.state.set(module.name, { weight: 1, successes: 0, invocations: 0 });
    }
  }

  plan(context: PromptModuleContext): PlannedPrompt {
    const candidates = this.modules.filter(module => {
      if (module.minComplexity !== undefined && context.complexity < module.minComplexity) {
        return false;
      }
      if (module.maxComplexity !== undefined && context.complexity > module.maxComplexity) {
        return false;
      }
      return true;
    });

    candidates.sort((a, b) => this.getModuleScore(b.name) - this.getModuleScore(a.name));

    const selected: PromptModule[] = [];
    let estimatedTokens = 0;
    for (const module of candidates) {
      if (estimatedTokens + module.estimatedTokens > this.tokenBudget) {
        continue;
      }
      selected.push(module);
      estimatedTokens += module.estimatedTokens;
    }

    const prompt = selected.map(module => module.template(context)).join('\n\n');
    return { modules: selected.map(module => module.name), prompt, estimatedTokens };
  }

  recordFeedback(feedback: PlannerFeedback): void {
    const state = this.state.get(feedback.module);
    if (!state) {
      return;
    }
    state.invocations += 1;
    state.successes += feedback.score;
    const successRate = state.successes / state.invocations;
    const adjustment = this.learningRate * (successRate - state.weight);
    state.weight = Math.max(0.1, state.weight + adjustment - feedback.tokenCost / 1000);
    this.state.set(feedback.module, state);
  }

  private getModuleScore(name: string): number {
    const state = this.state.get(name);
    return state ? state.weight : 0;
  }
}
