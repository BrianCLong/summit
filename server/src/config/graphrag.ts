import { z, type ZodType } from 'zod';

export interface UseCaseConfig {
  promptSchema: ZodType<any>;
  outputSchema: ZodType<any>;
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
  redisUrl: process.env.GRAPHRAG_REDIS_URL,
  useCases: {
    default: {
      promptSchema: defaultPrompt,
      outputSchema: defaultOutput,
      tokenBudget: parseInt(process.env.GRAPHRAG_TOKEN_BUDGET || '2000'),
      latencyBudgetMs: parseInt(
        process.env.GRAPHRAG_LATENCY_BUDGET_MS || '2000',
      ),
    },
  },
};

export default graphragConfig;
