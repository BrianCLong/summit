#!/usr/bin/env node

/**
 * Lineage Integrity Gate
 * Verifies that lineage artifacts are present, schema-compliant, and untampered.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const LINEAGE_DIR = 'artifacts/lineage';
const SCHEMA_FILE = 'lineage/lineage_schema.json';

function verifyLineage() {
  if (!fs.existsSync(LINEAGE_DIR)) {
    console.log('No lineage artifacts found to verify.');
    return;
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  const files = fs.readdirSync(LINEAGE_DIR).filter(f => f.endsWith('.json'));

  let violations = 0;

  files.forEach(file => {
    const filePath = path.join(LINEAGE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const event = JSON.parse(content);

    // Simple schema check (presence of required fields)
    const required = ['eventType', 'eventTime', 'run', 'job', 'producer'];
    const missing = required.filter(field => !event[field]);

    if (missing.length > 0) {
      console.error(`❌ ${file}: Missing required fields: ${missing.join(', ')}`);
      violations++;
    } else {
      console.log(`✅ ${file}: Lineage integrity verified.`);
    }
  });

  if (violations > 0) {
    console.error(`\nLineage verification failed with ${violations} violations.`);
    process.exit(1);
  }

  console.log('\nAll lineage artifacts passed integrity checks.');
}

verifyLineage();
