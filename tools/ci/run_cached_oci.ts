import { casKey } from '../ci/cas_key';
import { push } from '../oci/push';
import * as child from 'child_process';
const files = (process.env.SHARD_FILES || '').split(',').filter(Boolean);
const key = casKey({
  files,
  node: '18',
  pnpm: '9',
  jest: '29',
  env: {},
}).replace('ci:', '');
const ref = { repo: `ghcr.io/${process.env.GITHUB_REPOSITORY}/ci`, tag: key };
try {
  const out = child.execSync(`node tools/ci/run_cached.ts`, { stdio: 'pipe' });
  await push(
    ref,
    'application/vnd.intelgraph.ci.log',
    Buffer.from(out, 'utf8'),
    { kind: process.env.SHARD_KIND || '' },
  );
  process.stdout.write(out);
} catch (e: any) {
  await push(
    ref,
    'application/vnd.intelgraph.ci.log',
    Buffer.from(e.stdout || e.message || '', 'utf8'),
    { kind: 'error' },
  );
  process.exit(1);
}
