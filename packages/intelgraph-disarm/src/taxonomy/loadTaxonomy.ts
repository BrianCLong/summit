import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DisarmTaxonomySchema, type DisarmTaxonomy } from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadDisarmTaxonomy(): DisarmTaxonomy {
  // Path resolution strategy:
  // We expect the taxonomy directory to be a sibling of the src (or dist) directory's parent.
  // src/taxonomy/loadTaxonomy.ts -> ../../taxonomy/disarm.v1.yaml
  // dist/taxonomy/loadTaxonomy.js -> ../../taxonomy/disarm.v1.yaml

  const taxonomyPath = path.resolve(__dirname, '../../taxonomy/disarm.v1.yaml');

  if (!fs.existsSync(taxonomyPath)) {
    throw new Error(`DISARM taxonomy file not found at ${taxonomyPath}`);
  }

  const fileContents = fs.readFileSync(taxonomyPath, 'utf8');
  const data = yaml.load(fileContents);

  return DisarmTaxonomySchema.parse(data);
}
