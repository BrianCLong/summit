import { SemanticStore } from './semantic_store';
import { EpisodicStore } from './episodic_store';
import { SemanticRule, EpisodicExample } from './memory_types';

export interface RetrievedContext {
  rules: SemanticRule[];
  examples: EpisodicExample[];
}

export async function retrieveContext(
  input: string,
  semanticStore: SemanticStore,
  episodicStore: EpisodicStore,
  config?: { maxRules?: number; maxExamples?: number }
): Promise<RetrievedContext> {
  const rules = await semanticStore.retrieve({
    query: input, // In real world, might extract keywords
    limit: config?.maxRules || 3
  });

  const examples = await episodicStore.retrieve({
    query: input,
    limit: config?.maxExamples || 3
  });

  return { rules, examples };
}

export function formatContext(context: RetrievedContext): string[] {
  const parts: string[] = [];

  if (context.rules.length > 0) {
    parts.push('GUIDELINES:');
    context.rules.forEach(r => parts.push(`- ${r.content}`));
  }

  if (context.examples.length > 0) {
    parts.push('\nSIMILAR EXAMPLES:');
    context.examples.forEach(e => {
      parts.push(`Input: "${e.input}" -> Label: ${e.label} (${e.rationale})`);
    });
  }

  return parts;
}
