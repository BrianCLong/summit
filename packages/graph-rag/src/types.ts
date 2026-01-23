import { z } from 'zod';

export const GraphRAGConfigSchema = z.object({
  model: z.string().default('gpt-4'),
  temperature: z.number().default(0),
  max_tokens: z.number().default(1000),
  depth: z.number().default(2)
});

export type GraphRAGConfig = z.infer<typeof GraphRAGConfigSchema>;

export interface GraphRAGInput {
  query: string;
  config?: GraphRAGConfig;
}

export interface Node {
  id: string;
  label: string;
  properties: Record<string, any>;
  trust_level?: 'trusted' | 'verified' | 'untrusted';
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export interface RetrievalResult {
  traversal_path: string[]; // List of IDs
  ranked_candidates: Array<{
    id: string;
    score: number;
    source: 'vector' | 'graph';
    node: Node;
  }>;
}

export interface Context {
  payload: string; // The actual text/JSON prompt
  content_hash: string;
  payload_size: number;
}

export interface ModelInvocation {
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface GraphRAGOutput {
  answer: string;
  citations: Array<{
    node_id: string;
    text: string;
  }>;
  confidence: number;
}

export interface GraphRAGProvenance {
  run_id: string;
  timestamp: string;
  inputs: GraphRAGInput;
  retrieval: {
    traversal_path: string[];
    ranked_candidates: Array<{ id: string; score: number; source: 'vector' | 'graph' }>;
  };
  context: Context;
  model_invocation?: ModelInvocation;
  outputs: GraphRAGOutput;
}
