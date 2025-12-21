import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export function buildBundle(rego: string, outPath: string) {
  const tmpDir = path.join(process.cwd(), '.lac-bundle');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'policy.rego'), rego);
  const tar = zlib.gzipSync(Buffer.from(rego));
  fs.writeFileSync(outPath, tar);
  return outPath;
}
