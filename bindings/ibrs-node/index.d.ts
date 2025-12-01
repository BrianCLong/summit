export interface ProofTree {
  decision: string;
  applied_rule: {
    type: 'conditional';
    label: string;
    condition: unknown;
  } | {
    type: 'default';
    label: string;
  };
  facts: Array<{
    name: string;
    value: unknown;
    condition: unknown;
  }>;
}

export interface EvaluationResult {
  decision: string;
  proof: ProofTree;
}

export declare function evaluate(rules: string, facts: unknown): EvaluationResult;
export declare function verify(rules: string, facts: unknown, proof: unknown): EvaluationResult;
