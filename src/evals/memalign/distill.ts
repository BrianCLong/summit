import { SemanticStore } from './semantic_store';
import { EpisodicStore } from './episodic_store';
import { SemanticRule } from './memory_types';
import { makeEvidenceId } from '../evidence/evidence_id';

// Mock LLM distillation
function mockDistill(rationale: string): string {
  // Simple heuristic: if rationale mentions specific keywords, generalize it.
  if (rationale.toLowerCase().includes('demanding')) {
    return 'Avoid demanding language; use polite requests.';
  }
  if (rationale.toLowerCase().includes('modal verb')) {
    return 'Prefer modal verbs (could, would) for requests.';
  }
  return rationale; // Fallback
}

export async function distillMemories(
  episodicStore: EpisodicStore,
  semanticStore: SemanticStore,
  judgeName: string
): Promise<number> {
  const episodes = await episodicStore.list();
  let count = 0;

  // In a real implementation, we would batch these and send to an LLM
  // to cluster and extract principles.
  // Here, we just process each unique rationale.

  const processedRationales = new Set<string>();

  for (const ep of episodes) {
    // Filter by judge context if stored in metadata (omitted in simplistic ingest above, but implied)
    // For now, process all.

    if (processedRationales.has(ep.rationale)) continue;

    const ruleContent = mockDistill(ep.rationale);

    const rule: SemanticRule = {
      id: makeEvidenceId('MEM-SEM', { r: String(processedRationales.size), j: judgeName }),
      content: ruleContent,
      rule_type: 'guideline',
      metadata: {
        source_episodes: [ep.id],
        judge: judgeName
      }
    };

    await semanticStore.add(rule);
    processedRationales.add(ep.rationale);
    count++;
  }

  return count;
}
