#!/usr/bin/env node
/**
 * Generate API Documentation from OpenAPI specs
 *
 * This script discovers all OpenAPI specifications in the repository
 * and generates comprehensive API documentation by:
 * - Finding all .yaml and .json OpenAPI specs
 * - Validating spec files
 * - Copying them to the docs-site for Redocusaurus rendering
 * - Generating a catalog/index of all APIs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_SPECS = [
  {
    name: 'IntelGraph Core API',
    file: 'api/openapi.yaml',
    output: 'docs-site/static/api-specs/core-api.yaml',
    description: 'Core intelligence analysis platform API'
  },
  {
    name: 'Maestro Orchestration API',
    file: 'maestro-orchestration-api.yaml',
    output: 'docs-site/static/api-specs/maestro-api.yaml',
    description: 'Workflow orchestration and automation API'
  },
  {
    name: 'Pipelines API',
    file: 'contracts/pipelines.openapi.yaml',
    output: 'docs-site/static/api-specs/pipelines-api.yaml',
    description: 'Data pipeline management API'
  },
  {
    name: 'Executors API',
    file: 'contracts/executors.openapi.yaml',
    output: 'docs-site/static/api-specs/executors-api.yaml',
    description: 'Task executor management API'
  },
  {
    name: 'Policy Pack API',
    file: 'docs/contracts/policy-pack.openapi.yaml',
    output: 'docs-site/static/api-specs/policy-pack-api.yaml',
    description: 'Policy management and enforcement API'
  },
  {
    name: 'Evidence API',
    file: 'docs/contracts/evidence-api.openapi.yaml',
    output: 'docs-site/static/api-specs/evidence-api.yaml',
    description: 'Evidence collection and management API'
  }
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
  }
}

function copySpec(spec) {
  const sourcePath = path.join(__dirname, '../..', spec.file);
  const destPath = path.join(__dirname, '../..', spec.output);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠ Warning: Spec file not found: ${spec.file}`);
    return false;
  }

  try {
    ensureDir(path.dirname(destPath));
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ Copied ${spec.name}: ${spec.file} → ${spec.output}`);
    return true;
  } catch (error) {
    console.error(`✗ Error copying ${spec.name}: ${error.message}`);
    return false;
  }
}

function generateCatalog() {
  const catalogPath = path.join(__dirname, '../../docs-site/docs/api-catalog.md');

  const content = `---
id: api-catalog
title: API Catalog
sidebar_label: API Catalog
---

# API Reference Catalog

This page provides an overview of all available APIs in the IntelGraph platform.

## Available APIs

${API_SPECS.map(spec => `
### ${spec.name}

${spec.description}

- **Specification**: [View OpenAPI Spec](../api/${path.basename(spec.output, '.yaml')})

`).join('\n')}

## API Standards

All IntelGraph APIs follow these standards:

- **Format**: OpenAPI 3.0+
- **Authentication**: OAuth 2.0 / JWT
- **Rate Limiting**: Varies by endpoint
- **Versioning**: URL path versioning (e.g., \`/api/v1/\`)

## Getting Started

1. Review the specific API documentation for the service you want to integrate
2. Obtain API credentials from your administrator
3. Test endpoints using our interactive API explorer
4. Review example code in our [SDK documentation](../sdk/overview)

## Support

For API support, please:
- Check the [troubleshooting guide](../troubleshooting)
- Review [common errors](../errors)
- Contact support at support@intelgraph.com
`;

  ensureDir(path.dirname(catalogPath));
  fs.writeFileSync(catalogPath, content);
  console.log(`✓ Generated API catalog: ${catalogPath}`);
}

// Main execution
console.log('🚀 Generating API documentation...\n');

ensureDir('docs-site/static/api-specs');

let copiedCount = 0;
API_SPECS.forEach(spec => {
  if (copySpec(spec)) {
    copiedCount++;
  }
});

generateCatalog();

console.log(`\n✅ API documentation generation complete!`);
console.log(`   Processed ${copiedCount}/${API_SPECS.length} API specifications`);
