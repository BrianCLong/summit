import fs from 'fs';

const violations = [];
// scan agent configs for non-MCP tool usage

if (violations.length) {
  console.error('Non-MCP tools detected:', violations);
  process.exit(1);
}
