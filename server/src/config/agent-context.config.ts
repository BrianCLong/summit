import { AgentContextManager } from '@intelgraph/agent-context';

const strategyEnv = (process.env.AGENT_CONTEXT_STRATEGY || 'masking') as
  | 'masking'
  | 'summarization'
  | 'hybrid'
  | 'raw';

export const agentContextDefaults = {
  strategy: strategyEnv,
  tokenBudget: Number(process.env.AGENT_CONTEXT_TOKEN_BUDGET || 12000),
  reservedForResponse: Number(process.env.AGENT_CONTEXT_RESERVED || 1500),
  maxContextPct: Number(process.env.AGENT_CONTEXT_MAX_PCT || 0.85),
  maskingWindow: Number(process.env.AGENT_CONTEXT_MASKING_WINDOW || 10),
  summarizationTurnThreshold: Number(process.env.AGENT_CONTEXT_SUMMARY_TURNS || 14),
  summarizationTokenThreshold: Number(process.env.AGENT_CONTEXT_SUMMARY_TOKENS || 8000),
  maxTurns: Number(process.env.AGENT_CONTEXT_MAX_TURNS || 80),
  maxCostUsd: process.env.AGENT_CONTEXT_MAX_COST ? Number(process.env.AGENT_CONTEXT_MAX_COST) : undefined,
  plateauWindow: Number(process.env.AGENT_CONTEXT_PLATEAU_WINDOW || 5),
};

export function buildAgentContextManager(): AgentContextManager {
  return new AgentContextManager({
    defaultStrategy: agentContextDefaults.strategy,
    maskingWindow: agentContextDefaults.maskingWindow,
    summarizationTurnThreshold: agentContextDefaults.summarizationTurnThreshold,
    summarizationTokenThreshold: agentContextDefaults.summarizationTokenThreshold,
    reservedForResponse: agentContextDefaults.reservedForResponse,
    maxContextPct: agentContextDefaults.maxContextPct,
    plateauWindow: agentContextDefaults.plateauWindow,
  });
}
