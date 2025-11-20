// @scripts/security/custom-secrets-check.sh
/** @packages/maestroflow/src/transpile/types.ts {import(' @docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'Get Started',
      items: [
        'README', // docs/README.md
        'get-started/quickstart',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/certification',
      ],
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance/provenance',
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
  ],
};
module.exports = sidebars;
