#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';

const args = process.argv.slice(2);
const schemaIndex = args.indexOf('--schema');
const topicIndex = args.indexOf('--topic');
if (schemaIndex === -1 || topicIndex === -1) {
  console.error('Usage: schema-lint.js --schema <file> --topic <name>');
  process.exit(1);
}
const schemaPath = args[schemaIndex + 1];
const topic = args[topicIndex + 1];
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

if (!schema.namespace || !schema.name) {
  console.error('Schema missing namespace or name');
  process.exit(1);
}
if ((schema.compatibility || 'BACKWARD') !== 'BACKWARD') {
  console.error(`Schema for ${topic} violates BACKWARD compatibility rule`);
  process.exit(1);
}
console.log(`Schema for ${topic} accepted with BACKWARD compatibility.`);
