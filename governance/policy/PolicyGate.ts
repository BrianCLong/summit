export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  evidenceIds: string[];
}

export class PolicyGate {
  evaluate(action: any): PolicyDecision {
    return { allowed: true, reason: 'ok', evidenceIds: ['EID:CIV:policy:test:0001'] };
  }
}
