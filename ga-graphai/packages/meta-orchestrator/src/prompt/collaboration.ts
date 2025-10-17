import type { TokenEstimator } from './utils.js';
import { defaultTokenEstimator } from './utils.js';

export interface ContextState {
  id: string;
  content: string;
  lastUpdated: number;
  metadata?: Record<string, unknown>;
}

export interface ContextDiff {
  id: string;
  content: string;
  tokenEstimate: number;
}

export interface AgentAssignment {
  agent: string;
  prompt: string;
}

export interface BrokerOptions {
  tokenLimitPerSync: number;
  tokenEstimator?: TokenEstimator;
}

export class CollaborativeContextBroker {
  private readonly tokenLimit: number;
  private readonly tokenEstimator: TokenEstimator;
  private readonly context = new Map<string, ContextState>();

  constructor(options: BrokerOptions) {
    this.tokenLimit = options.tokenLimitPerSync;
    this.tokenEstimator = options.tokenEstimator ?? defaultTokenEstimator;
  }

  upsert(state: ContextState): void {
    this.context.set(state.id, state);
  }

  getSnapshot(): ContextState[] {
    return [...this.context.values()].sort((a, b) => a.lastUpdated - b.lastUpdated);
  }

  diffSince(timestamp: number): ContextDiff[] {
    const diffs: ContextDiff[] = [];
    let usedTokens = 0;
    for (const state of this.getSnapshot()) {
      if (state.lastUpdated <= timestamp) {
        continue;
      }
      const estimate = this.tokenEstimator(state.content);
      if (usedTokens + estimate > this.tokenLimit) {
        break;
      }
      diffs.push({ id: state.id, content: state.content, tokenEstimate: estimate });
      usedTokens += estimate;
    }
    return diffs;
  }

  assignAgents(agents: string[], basePrompt: string, timestamp: number): AgentAssignment[] {
    const diffs = this.diffSince(timestamp);
    const assignments: AgentAssignment[] = [];
    for (let index = 0; index < agents.length; index += 1) {
      const diff = diffs[index];
      const prompt = diff
        ? `${basePrompt}\n\nContext update (${diff.id}):\n${diff.content}`
        : basePrompt;
      assignments.push({ agent: agents[index], prompt });
    }
    return assignments;
  }
}
