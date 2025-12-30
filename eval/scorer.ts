import { EvalItem, EvalResult, EvalItemSchema, EvalResultSchema } from './types.js';

export function scoreItem(item: EvalItem, actual: string): EvalResult {
  let score = 0;
  let pass = false;

  // Simple heuristic scoring
  if (item.criteria?.startsWith('Exact match:')) {
    const target = item.criteria.replace('Exact match:', '').trim();
    if (actual.trim() === target) {
      score = 1;
      pass = true;
    }
  } else {
    // Basic containment check
    const normalizedActual = actual.toLowerCase();
    const normalizedExpected = item.expected.toLowerCase();

    // Check if expected text is in actual (or vice versa for flexibility in this mock)
    // In a real scenario, this would be an LLM-based grader or embedding similarity
    if (normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual)) {
      score = 1;
      pass = true;
    } else if (item.criteria) {
        // loose criteria check
        const keywords = item.criteria.toLowerCase().replace('must mention', '').replace('.', '').split(' ').filter((w: string) => w.length > 3);
        const matchCount = keywords.filter((k: string) => normalizedActual.includes(k)).length;
        if (matchCount > 0) {
            score = matchCount / keywords.length;
            if (score > 0.5) pass = true;
        }
    }
  }

  return {
    input: item.input,
    expected: item.expected,
    actual,
    score,
    pass,
    evidence: {
      stub: true,
      source: "mock-eval-harness"
    }
  };
}

export function generateReport(results: EvalResult[], config: any): any {
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const accuracy = total > 0 ? passed / total : 0;

  return {
    timestamp: new Date().toISOString(),
    commit_sha: process.env.GITHUB_SHA || 'unknown',
    config,
    results,
    summary: {
      total,
      passed,
      accuracy
    }
  };
}
