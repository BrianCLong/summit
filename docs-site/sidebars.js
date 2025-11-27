// @scripts/security/custom-secrets-check.sh
/** @packages/maestroflow/src/transpile/types.ts {import(' @docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'Get Started',
      items: [
        'README', // docs/README.md
        'DEVELOPER_ONBOARDING',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: ['tutorials/first-ingest', 'tutorials/first-query'],
    },
    {
      type: 'category',
      label: 'How-tos',
      items: [
        'runbooks/prod-readiness-runbook',
        'maestro/CANARY_ROLLBACK_RUNBOOK',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'ARCHITECTURE',
        'DATA_MODEL',
        'ENV_VARS',
        {
          type: 'link',
          label: 'Maestro API',
          href: '/intelgraph/api/maestro/1.0.0',
        },
        { type: 'link', label: 'Core API', href: '/intelgraph/api/core/1.0.0' },
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'maestro/ARCHITECTURE',
        'architecture/semantic-search-system',
        'prov-ledger',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'RUNBOOKS',
        'runbooks/orchestration-troubleshooting',
        'runbooks/ml-pipeline-troubleshooting',
        'maestro/DR_RUNBOOK',
        'infra/dr-runbook',
        'devops/incident-runbook',
      ],
    },
    {
      type: 'category',
      label: 'Release Notes',
      items: [
        'releases/RELEASE_NOTES_1.0.0',
        'releases/RELEASE_NOTES_v2.5',
        'releases/GA-CORE-RELEASE_NOTES',
      ],
    },
    {
      type: 'category',
      label: 'ADRs',
      items: [
        'ADR/ADR-001-two-product-strategy',
        'ADR/ADR-002-contract-only-integration',
        'ADR/ADR-003-separate-repos-packaged-adapters',
        'ADR/ADR-007-MoE-MCP-Conductor',
        'ADR/ADR-013-orchestration-ml-split',
      ],
    },
  ],
};
module.exports = sidebars;
