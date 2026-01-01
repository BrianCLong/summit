import { glob } from 'glob';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

async function main() {
  console.log('🚀 Starting Unified Test Runner...');

  // Find all test files
  // Exclude integration/e2e if they require heavy setup not present here
  // Focus on unit tests and security tests first
  const testFiles = await glob('tests/**/*.test.ts', {
    cwd: serverRoot,
    ignore: ['node_modules/**', 'dist/**', 'coverage/**']
  });

  if (testFiles.length === 0) {
    console.error('❌ No test files found.');
    process.exit(1);
  }

  console.log(`Found ${testFiles.length} test files.`);

  // We need to register ts-node or similar loader for .ts files if we run them directly
  // However, node:test supports running files.
  // We will use 'tsx' to execute the runner, which handles the TS compilation.

  const stream = run({
    files: testFiles.map(f => path.join(serverRoot, f)),
    concurrency: true,
  });

  stream.on('test:fail', (data) => {
    // console.log('Test failed:', data.name);
  });

  stream.compose(new spec()).pipe(process.stdout);

  // Ensure we exit with error if tests fail
  let failed = false;
  stream.on('test:fail', () => { failed = true; });

  // Force exit after a timeout if tests hang
  const timeout = setTimeout(() => {
    console.error('\n❌ Global Test Timeout (60s) - forcing exit.');
    process.exit(1);
  }, 60000); // 60s global timeout

  // Wait for stream to end
  await new Promise((resolve) => stream.on('end', resolve));
  clearTimeout(timeout);

  if (failed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
