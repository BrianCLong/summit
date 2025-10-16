import { casKey } from './cas_key';
import * as child from 'child_process';
import * as fs from 'fs';
import * as cas from './cas';
const kind = process.env.SHARD_KIND!;
const files = (process.env.SHARD_FILES || '').split(',').filter(Boolean);
const key = casKey({
  files,
  node: process.env.NODE_VERSION || '18',
  pnpm: process.env.PNPM_VERSION || '9',
  jest: '29',
  env: {},
});

(async () => {
  if (await cas.has(key)) {
    const out = await cas.get(key);
    process.stdout.write(out.toString());
    console.log(`::notice ::CAS hit ${key}`);
    process.exit(0);
  }
  const cmd =
    kind === 'build'
      ? 'pnpm turbo run build --filter=...[HEAD^]'
      : kind === 'lint'
        ? 'pnpm turbo run lint --filter=...[HEAD^]'
        : kind === 'policy'
          ? 'conftest test policy.json -p tools/policy'
          : `npx jest --ci --runTestsByPath ${files.join(' ')}`;
  const out = child.execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
  await cas.put(key, Buffer.from(out, 'utf8'));
  process.stdout.write(out);
})();
