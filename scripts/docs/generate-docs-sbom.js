const fs = require('fs');
const path = require('path');

// This script would typically generate a Software Bill of Materials (SBOM)
// for the documentation site. For now, it will create a placeholder.
console.log('Generating SBOM for documentation site...');

const sbom = {
  name: 'intelgraph-docs-site',
  version: '1.0.0',
  components: [
    {
      name: 'docusaurus',
      version: 'latest',
      type: 'library',
    },
    {
      name: 'react',
      version: 'latest',
      type: 'library',
    },
  ],
};

fs.writeFileSync('docs/sbom.json', JSON.stringify(sbom, null, 2));
console.log('SBOM generated: docs/sbom.json');
