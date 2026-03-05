const fs = require('fs');
const ciPath = '.github/workflows/ci.yml';
let ciContent = fs.readFileSync(ciPath, 'utf8');

const driftJob = `
  ai-evals-drift:
    name: AI Evals Drift Check
    if: github.event_name == 'schedule' || github.event_name == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: "pnpm"
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Run Drift Check
        run: node scripts/monitoring/eval-driven-agentic-rag-2026-drift.mjs
`;

if (!ciContent.includes('ai-evals-drift:')) {
  ciContent = ciContent.replace('  unit-tests:', driftJob + '\n  unit-tests:');
  fs.writeFileSync(ciPath, ciContent);
  console.log("Patched ci.yml with ai-evals-drift job");
} else {
  console.log("ci.yml already patched");
}
