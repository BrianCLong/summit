const fs = require('fs');

const path = '.github/workflows/integration-tests.yml';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    `run: npm run test:integration`,
    `run: pnpm exec cross-env NODE_OPTIONS='--experimental-vm-modules' pnpm exec jest --config jest.config.ts --testPathPattern=integration --passWithNoTests`
  );
  fs.writeFileSync(path, content);
}
