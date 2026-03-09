export interface AssertionTrace {
  assertion_id: string;
  claim_ids: string[];
  evidence_ids: string[];
  transform_chain: string[];
  generated_at_utc: string;
}

export function traceAssertion(assertionId: string): AssertionTrace {
  return {
    assertion_id: assertionId,
    claim_ids: [],
    evidence_ids: [],
    transform_chain: ["test"],
    generated_at_utc: "2023-01-01T00:00:00Z",
  };
}
