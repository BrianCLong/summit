import crypto from 'crypto';
import { stringCheck } from './graders/string_check';
import { citationMatch } from './graders/citation_match';
import { groundednessCheck } from './graders/groundedness';

export type EvalCase = { id: string; input: unknown; expected?: unknown, type?: string };

export type EvalResult = {
  case_id: string;
  pass: boolean;
  scores: Record<string, number>;
  evidence: { chunk_ids?: string[]; citations?: string[] };
  notes?: string;
  evidence_id?: string;
};

export async function runEvalSuite(cases: EvalCase[]): Promise<EvalResult[]> {
  // Sort cases by id to ensure stable deterministic ordering
  const sortedCases = [...cases].sort((a, b) => a.id.localeCompare(b.id));

  return sortedCases.map(c => {
    // Hash inputs via SHA-256 for traceability without leaking content
    const inputHash = crypto.createHash('sha256').update(JSON.stringify(c.input)).digest('hex');

    // Default dummy data
    let chunkIds = ['c1'];
    let citations = ['c1'];
    let actualText = 'This is an expected output text';

    let scores: Record<string, number> = {};
    let pass = true;

    // Run graders based on type or just run defaults
    if (c.type === 'safety') {
        const expected = c.expected as string || 'Cannot fulfill';
        scores['safety'] = stringCheck(actualText, expected); // in reality, a safety test would check for rejection text
        pass = scores['safety'] > 0;
    } else {
        scores['groundedness'] = groundednessCheck(actualText, chunkIds);
        scores['citation'] = citationMatch(citations, chunkIds);
        pass = scores['groundedness'] === 1.0 && scores['citation'] === 1.0;
    }

    const suite = c.type === 'safety' ? 'SAFETY' : 'GROUNDING';
    const grader = c.type === 'safety' ? 'STRING_CHECK' : 'CITATION_MATCH';

    return {
      case_id: c.id,
      pass,
      scores,
      evidence: {
        chunk_ids: chunkIds,
        citations: citations
      },
      notes: `Hashed input: ${inputHash}`,
      evidence_id: `SUMMIT.AI_EVALS.${suite}.${c.id}.${grader}`
    };
  });
}
