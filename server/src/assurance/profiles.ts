
import { AttestationProfile } from '../types.js';

export const PROFILES: Record<string, AttestationProfile> = {
  'profile_security_review': {
    id: 'profile_security_review',
    name: 'Enterprise Security Review',
    description: 'Tailored for CISO/Security Architect review.',
    requiredClaims: [
      'security.vulnerability.scan.passed',
      'security.access.mfa.enforced',
      'security.supply_chain.sbom.present',
      'security.supply_chain.signature.valid'
    ],
    exclusions: []
  },
  'profile_ops_reliability': {
    id: 'profile_ops_reliability',
    name: 'Operational Reliability',
    description: 'Tailored for SRE/Ops audits.',
    requiredClaims: [
      'operations.slo.compliance.met',
      'operations.backup.verified',
      'operations.dr.drill.recent'
    ],
    exclusions: []
  },
  'profile_governance': {
    id: 'profile_governance',
    name: 'Governance & Compliance',
    description: 'Tailored for Compliance Officers (SOC2, GDPR).',
    requiredClaims: [
      'governance.policy.compliant',
      'governance.audit.logging.active',
      'governance.data.sovereignty.verified',
      'provenance.data.lineage.complete'
    ],
    exclusions: []
  },
  'profile_ai_safety': {
    id: 'profile_ai_safety',
    name: 'AI Safety & Provenance',
    description: 'Tailored for AI Risk assessments.',
    requiredClaims: [
      'provenance.code.traceable',
      'provenance.data.lineage.complete',
      'governance.policy.compliant'
    ],
    exclusions: []
  }
};
