// Validation utility for GraphRAG fixtures
import fs from 'fs';
import path from 'path';

const REGISTRY_PATH = path.resolve('GOLDEN/datasets/graphrag/registry.json');

function validateFixtures() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('Registry missing');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const idRegex = /^EVD-GRAPHRAG-FIXTURE-\d{3}$/;

  const ids = new Set();

  for (const fixture of registry.fixtures) {
    if (!idRegex.test(fixture.id)) {
       console.error(`Invalid EVD format for ${fixture.id}`);
       process.exit(1);
    }
    if (ids.has(fixture.id)) {
       console.error(`Duplicate ID found: ${fixture.id}`);
       process.exit(1);
    }
    ids.add(fixture.id);
  }

  console.log('All fixtures validated successfully.');
}

validateFixtures();
