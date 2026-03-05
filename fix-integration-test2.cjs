const fs = require('fs');
const file = 'server/src/maestro/__tests__/integration.test.ts';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  /testRunId = result\.rows\[0\]\?\.id;/,
  `if (result && result.rows && result.rows.length > 0) {\n      testRunId = result.rows[0].id;\n    } else {\n      throw new Error('Failed to create test run in integration test');\n    }`
);
fs.writeFileSync(file, content);
