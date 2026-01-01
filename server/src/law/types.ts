
export type LawType = 'EPISTEMIC' | 'DECISION' | 'INFORMATION';

export interface Law {
  id: string;
  name: string;
  type: LawType;
  description: string;
  version: string;
  enforce: (context: Context) => Promise<ValidationResult>;
}

export interface Context {
  actor: {
    id: string;
    roles: string[];
    [key: string]: any;
  };
  action: string;
  resource: any;
  evidence?: any[];
  [key: string]: any;
}

export interface Proof {
  type: string;
  value: any;
  signature?: string;
}

export interface Refusal {
  id: string;
  timestamp: string;
  lawId: string;
  reason: string;
  context: Context;
}

export interface ValidationResult {
  allowed: boolean;
  violations: Refusal[];
}
