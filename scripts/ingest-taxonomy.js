#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { getNeo4jDriver } from '../server/src/db/neo4j.js';

const TAXONOMY_FILE_PATH = resolve(process.cwd(), 'docs/master-document-taxonomy.yaml');
const TENANT_ID = 'system'; // Using a system-level tenant for the taxonomy

/**
 * Parses the taxonomy from the YAML file.
 * @returns {Object} An object containing the parsed categories and relationships.
 */
export function parseTaxonomy() {
  const content = readFileSync(TAXONOMY_FILE_PATH, 'utf-8');
  return yaml.load(content);
}

/**
 * Ingests the parsed taxonomy into the database.
 * @param {Object} taxonomy The parsed taxonomy, containing categories and relationships.
 */
export async function ingestTaxonomy(taxonomy) {
  console.log('Ingesting taxonomy into the database...');
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Ingest categories and documents
    for (const category of taxonomy.categories) {
      for (const doc of category.documents) {
        const variants = doc.name.split(' / ').map(v => v.trim());
        await session.run(
          `
          MERGE (c:Entity:DocumentCategory { name: $categoryName, tenantId: $tenantId })
          ON CREATE SET c.id = randomUUID(), c.createdAt = datetime(), c.kind = 'DocumentCategory', c.props = { name: $categoryName }

          MERGE (d:Entity:Document { name: $name, tenantId: $tenantId })
          ON CREATE SET d.id = randomUUID(), d.createdAt = datetime(), d.kind = 'Document', d.props = { name: $name, subType: $subType, variants: $variants }
          ON MATCH SET d.props.subType = $subType, d.props.variants = $variants

          MERGE (c)-[:HAS_DOCUMENT]->(d)
        `,
          {
            categoryName: category.name,
            name: doc.name,
            subType: variants[0],
            variants: variants,
            tenantId: TENANT_ID,
          }
        );
      }
    }
    console.log('Finished ingesting categories and documents.');

    // Ingest relationships
    console.log('Ingesting inter-document relationships...');
    for (const rel of taxonomy.relationships) {
      await session.run(
        `
        MATCH (source:Document { name: $sourceName, tenantId: $tenantId })
        MATCH (target:Document { name: $targetName, tenantId: $tenantId })
        MERGE (source)-[r:RELATED { type: $relType }]->(target)
      `,
        {
          sourceName: rel.source,
          targetName: rel.target,
          relType: rel.type,
          tenantId: TENANT_ID,
        }
      );
    }
    console.log('Finished ingesting relationships.');
    console.log('Taxonomy ingestion complete.');
  } finally {
    await session.close();
    await driver.close();
  }
}

async function main() {
  try {
    const taxonomy = parseTaxonomy();
    await ingestTaxonomy(taxonomy);
  } catch (error) {
    console.error('Failed to ingest taxonomy:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
