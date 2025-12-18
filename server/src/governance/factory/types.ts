export interface AgentPassport {
  id: string; // UUID
  agentId: string;
  issuedAt: Date;
  expiresAt: Date;
  scopes: string[]; // e.g., 'read:repo', 'write:comment'
  complianceTags: ComplianceTag[];
  signature: string; // Cryptographic signature
}

export type ComplianceTag = 'SOC2' | 'NIST-800-53' | 'GDPR' | 'INTERNAL_ONLY';

export interface PolicyPack {
  id: string;
  name: string;
  framework: 'SOC2' | 'NIST' | 'CUSTOM';
  rules: string[]; // Rego policy references or rule definitions
  enforcementLevel: 'STRICT' | 'AUDIT';
}
