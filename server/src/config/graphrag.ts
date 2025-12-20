import { z } from 'zod';
import config from './index.js';

export interface UseCaseConfig {
  promptSchema: any;
  outputSchema: any;
  tokenBudget: number;
  latencyBudgetMs: number;
}

const defaultPrompt = z.object({
  question: z.string().min(3),
});

const defaultOutput = z.object({
  answer: z.string(),
  confidence: z.number(),
  citations: z.object({ entityIds: z.array(z.string()) }),
  why_paths: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      relId: z.string(),
      type: z.string(),
      supportScore: z.number().optional(),
    }),
  ),
});

const graphragConfig: {
  redisUrl?: string;
  useCases: Record<string, UseCaseConfig>;
} = {
  redisUrl: config.graphrag.redisUrl,
  useCases: {
    default: {
      promptSchema: defaultPrompt,
      outputSchema: defaultOutput,
      tokenBudget: config.graphrag.tokenBudget,
      latencyBudgetMs: config.graphrag.latencyBudgetMs,
    },
  },
};

export default graphragConfig;
