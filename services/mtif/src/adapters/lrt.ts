import { randomUUID } from 'node:crypto';
import type { LlmThreat, LrtRun, ThreatCategory } from '../types.js';

const promptCategoryByFinding = (finding: {
  jailbreak?: string;
  tool?: string;
}): ThreatCategory => {
  if (finding.tool) {
    return 'tool-abuse';
  }
  if (finding.jailbreak) {
    return 'jailbreak-pattern';
  }
  return 'attack-prompt';
};

export const ingestLrtRun = (run: LrtRun): LlmThreat[] => {
  return run.findings.map((finding, index) => {
    const category = promptCategoryByFinding(finding);
    const metadata: Record<string, unknown> = {
      run_id: run.id,
      run_name: run.name,
      operator: run.operator,
      sequence: index,
      response_summary: finding.response_summary,
      notes: finding.notes,
      jailbreak_pattern: finding.jailbreak,
      tool: finding.tool
    };

    return {
      id: randomUUID(),
      category,
      title:
        category === 'tool-abuse'
          ? `${finding.tool ?? 'tool'} abuse signature`
          : category === 'jailbreak-pattern'
            ? 'LLM jailbreak pattern'
            : 'LLM attack prompt',
      description: finding.prompt,
      llm_family: finding.llm_family,
      severity: finding.severity,
      observed_at: finding.observed_at,
      metadata
    } satisfies LlmThreat;
  });
};
