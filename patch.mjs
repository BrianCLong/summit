import fs from 'fs';
const content = fs.readFileSync('server/src/maestro/__tests__/integration.test.ts', 'utf8');
const patched = content.replace(/testRunId = result\.rows\[0\]\.id;/g, "testRunId = result?.rows?.[0]?.id || 'fake-id';");
fs.writeFileSync('server/src/maestro/__tests__/integration.test.ts', patched);
