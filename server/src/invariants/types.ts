export interface Invariant {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (context: any) => Promise<boolean>;
  remediation?: string;
}

export interface InvariantViolation {
  invariantId: string;
  timestamp: Date;
  details: string;
  context: any;
}
