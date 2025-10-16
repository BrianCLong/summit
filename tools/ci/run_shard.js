const { execSync } = require('child_process');
const kind = process.env.SHARD_KIND;
if (kind === 'build')
  execSync('pnpm turbo run build --filter=...[HEAD^]', { stdio: 'inherit' });
if (kind === 'lint')
  execSync('pnpm turbo run lint --filter=...[HEAD^]', { stdio: 'inherit' });
if (kind === 'policy')
  execSync('conftest test policy.json -p tools/policy', { stdio: 'inherit' });
if (kind === 'test') {
  const files = (process.env.SHARD_FILES || '').split(',').filter(Boolean);
  execSync(`npx jest --ci --runTestsByPath ${files.join(' ')}`, {
    stdio: 'inherit',
  });
}
