import { buildBundle } from '../../src/bundle';
import fs from 'fs';

test('writes gzip bundle', () => {
  const out = buildBundle('package x\nallow=true', '/tmp/policy.gz');
  expect(fs.existsSync(out)).toBe(true);
});
