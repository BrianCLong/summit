#!/usr/bin/env node
import process from 'node:process';

const topicIndex = process.argv.indexOf('--topic');
if (topicIndex === -1) {
  console.error('Usage: dlq-replay.js --topic <name> [--limit N]');
  process.exit(1);
}
const topic = process.argv[topicIndex + 1];
const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex === -1 ? 50 : Number(process.argv[limitIndex + 1]);
console.log(`Replaying up to ${limit} messages from ${topic} with audit trail...`);
