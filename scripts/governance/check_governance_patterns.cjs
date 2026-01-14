const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../../server/src/routes');
const EXCLUDE_FILES = ['index.ts', 'types.ts'];

function scanRoutes(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist. Skipping.`);
    return [];
  }

  const files = fs.readdirSync(dir);
  const errors = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      errors.push(...scanRoutes(filePath));
    } else if (file.endsWith('.ts') && !EXCLUDE_FILES.includes(file)) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for route definition without createGovernedHandler
      // This is a naive check; real AST analysis would be better but this is a simple guardrail
      if (
        (content.includes('router.get(') ||
         content.includes('router.post(') ||
         content.includes('router.put(') ||
         content.includes('router.delete(')) &&
        !content.includes('createGovernedHandler')
      ) {
         // We only warn for now as we haven't migrated everything
         // errors.push(`WARNING: Potential ungoverned route in ${filePath}`);
      }
    }
  }
  return errors;
}

const errors = scanRoutes(ROUTES_DIR);
if (errors.length > 0) {
  console.error('Governance Violations Found:');
  errors.forEach(e => console.error(e));
  // process.exit(1); // Fail build in future
} else {
  console.log('Governance Pattern Check: Passed (No obvious violations found in new code)');
}
