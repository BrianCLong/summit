#!/usr/bin/env node
// Generate VEX (Vulnerability Exploitability eXchange) in CSAF format
const fs = require('fs');
const path = require('path');

function generateVEX(sbomPath) {
  const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));

  const vex = {
    document: {
      category: 'csaf_vex',
      csaf_version: '2.0',
      publisher: {
        category: 'vendor',
        name: 'IntelGraph',
        namespace: 'https://intelgraph.com',
      },
      title: 'IntelGraph VEX Document',
      tracking: {
        current_release_date: new Date().toISOString(),
        id: `intelgraph-vex-${Date.now()}`,
        initial_release_date: new Date().toISOString(),
        revision_history: [
          {
            date: new Date().toISOString(),
            number: '1.0.0',
            summary: 'Initial VEX document',
          },
        ],
        status: 'final',
        version: '1.0.0',
      },
    },
    product_tree: {
      branches: [
        {
          category: 'vendor',
          name: 'IntelGraph',
          branches: [
            {
              category: 'product_name',
              name: 'IntelGraph Platform',
              product: {
                product_id: 'intelgraph-platform',
                name: 'IntelGraph Platform',
              },
            },
          ],
        },
      ],
    },
    vulnerabilities: [],
  };

  // Add vulnerabilities from SBOM if any exist
  if (sbom.vulnerabilities && sbom.vulnerabilities.length > 0) {
    sbom.vulnerabilities.forEach((vuln) => {
      vex.vulnerabilities.push({
        cve: vuln.id || vuln.cve,
        product_status: {
          known_not_affected: ['intelgraph-platform'],
        },
        flags: [
          {
            label: 'component_not_present',
            product_ids: ['intelgraph-platform'],
          },
        ],
      });
    });
  }

  return JSON.stringify(vex, null, 2);
}

if (require.main === module) {
  const sbomPath = process.argv[2];
  if (!sbomPath) {
    console.error('Usage: node make_vex.js <sbom.json>');
    process.exit(1);
  }

  try {
    const vex = generateVEX(sbomPath);
    console.log(vex);
  } catch (error) {
    console.error('Error generating VEX:', error);
    process.exit(1);
  }
}

module.exports = { generateVEX };
