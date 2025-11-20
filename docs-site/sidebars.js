// @scripts/security/custom-secrets-check.sh
/** @packages/maestroflow/src/transpile/types.ts {import(' @docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'Get Started',
      items: [
        'README', // Summit IntelGraph Overview
        'get-started/quickstart-5-min', // 5-Minute Quickstart
        'DEVELOPER_ONBOARDING', // 30-Minute Developer Onboarding
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/first-ingest',
        'tutorials/first-query',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Platform Architecture',
          items: [
            'ARCHITECTURE', // High-level architecture
            'maestro/ARCHITECTURE', // Maestro-specific architecture
            'architecture/semantic-search-system',
          ],
        },
        {
          type: 'category',
          label: 'Key Features',
          items: [
            'concepts/provenance', // Provenance & Policy Enforcement
            'concepts/copilot', // AI Copilot (NL to Cypher)
            'prov-ledger', // Provenance Ledger (existing)
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        {
          type: 'category',
          label: 'CLI Tools',
          items: [
            'reference/maestro-cli', // Maestro CLI Reference
          ],
        },
        {
          type: 'category',
          label: 'API Documentation',
          items: [
            {
              type: 'link',
              label: 'Maestro Orchestration API',
              href: '/intelgraph/api/maestro/1.0.0',
            },
            {
              type: 'link',
              label: 'IntelGraph Core API',
              href: '/intelgraph/api/core/1.0.0',
            },
          ],
        },
        {
          type: 'category',
          label: 'Configuration',
          items: [
            'DATA_MODEL',
            'ENV_VARS',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'How-To Guides',
      items: [
        'runbooks/prod-readiness-runbook',
        'maestro/CANARY_ROLLBACK_RUNBOOK',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'RUNBOOKS',
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
      label: 'Architecture Decisions',
      items: [
        'ADR/ADR-001-two-product-strategy',
        'ADR/ADR-002-contract-only-integration',
        'ADR/ADR-003-separate-repos-packaged-adapters',
        'ADR/ADR-007-MoE-MCP-Conductor',
      ],
    },
  ],
};
module.exports = sidebars;
