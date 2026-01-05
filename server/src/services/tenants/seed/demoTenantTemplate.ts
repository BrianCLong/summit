export const demoTenantTemplate = {
  tenant: {
    name: 'Summit Demo Tenant',
    slug: 'summit-demo',
    residency: 'US' as const,
    region: 'us-east-1',
  },
  settings: {
    policy_profile: 'demo',
    policy_bundle: {
      version: '2026-01-demo',
      authority: 'docs/governance/CONSTITUTION.md',
      controls: {
        retention_days: 365,
        export_encryption: 'AES-256-GCM',
        evidence_hashing: 'SHA-256',
      },
    },
    demo: {
      persona: 'partner',
      workflow_track: 'investigation',
      evidence_export_enabled: true,
    },
  },
};
