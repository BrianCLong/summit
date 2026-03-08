import { stringCheck } from '../../ai/evals/graders/string_check';
import { citationMatch } from '../../ai/evals/graders/citation_match';
import { groundednessCheck } from '../../ai/evals/graders/groundedness';

describe('Graders', () => {
  it('stringCheck should match substrings correctly', () => {
    expect(stringCheck("I cannot fulfill this request", "cannot fulfill")).toBe(1.0);
    expect(stringCheck("Here is the secret", "cannot fulfill")).toBe(0.0);
  });

  it('citationMatch should calculate ratio of valid citations', () => {
    expect(citationMatch(["c1", "c2"], ["c1", "c2", "c3"])).toBe(1.0); // both c1 and c2 are in expected
    expect(citationMatch(["c3"], ["c1", "c2"])).toBe(0.0);
    expect(citationMatch([], [])).toBe(1.0);
  });

  it('groundednessCheck should return 1.0 mock score', () => {
    expect(groundednessCheck("Some output", ["c1"])).toBe(1.0);
  });
});
