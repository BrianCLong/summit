const fs = require('fs');
const path = '.github/workflows/integration-tests.yml';
if (fs.existsSync(path)) {
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `      - name: Run Integration Tests
        working-directory: server
        run: npm run test:integration`,
  `      - name: Run Integration Tests
        working-directory: server
        run: pnpm dlx cross-env NODE_OPTIONS='--experimental-vm-modules' pnpm dlx jest --config jest.config.ts --testPathPattern=integration --passWithNoTests`
);

fs.writeFileSync(path, content);
}
