import * as crypto from 'crypto';
import * as fs from 'fs';
type KeyInput = {
  files: string[];
  node: string;
  pnpm: string;
  jest: string;
  env: Record<string, string>;
};
export function casKey(inp: KeyInput) {
  const h = crypto.createHash('sha256');
  h.update(
    JSON.stringify({
      node: inp.node,
      pnpm: inp.pnpm,
      jest: inp.jest,
      env: inp.env,
    }),
  );
  for (const f of inp.files.sort()) {
    h.update(f);
    h.update('\0');
    try {
      h.update(fs.readFileSync(f));
    } catch {
      h.update('MISSING');
    }
  }
  return 'ci:' + h.digest('hex');
}
