// tests/subsumption/claim-level-graphrag/claim_extractor.test.ts
import { extractClaims } from '../../../src/subsumption/claim_level/claim_extractor';

describe('Claim Extractor', () => {
  test('should split text into sentences', () => {
    const text = "The sky is blue. The grass is green.";
    const claims = extractClaims(text);
    expect(claims).toHaveLength(2);
    expect(claims[0].text).toBe("The sky is blue.");
    expect(claims[1].text).toBe("The grass is green.");
    expect(claims[0].claim_id).toBe("CLM-001");
    expect(claims[1].claim_id).toBe("CLM-002");
  });

  test('should handle empty input', () => {
    expect(extractClaims("")).toEqual([]);
  });
});
