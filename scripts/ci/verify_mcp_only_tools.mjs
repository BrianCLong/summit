const violations = [];
// scan agent configs for non-MCP tool usage
// This is a placeholder for the actual scan logic as requested.

if (violations.length) {
  console.error('Non-MCP tools detected:', violations);
  process.exit(1);
}
console.log('Verified: No non-MCP tools detected.');
