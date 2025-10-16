import * as fs from 'fs';
type Node = { name: string; version: string; deps: string[] };
export function buildGraph(): Node[] {
  const ws = JSON.parse(
    fs
      .readFileSync('pnpm-workspace.yaml', 'utf8')
      .replace(/:.*/g, '')
      .replace(/-/g, '_'),
  ) as any; // simplistic
  // alternatively inspect package.json dependencies
  const pkgs = JSON.parse(fs.readFileSync('packages.json', 'utf8')); // prebuilt map
  return pkgs.map((p: any) => ({
    name: p.name,
    version: p.version,
    deps: Object.keys(p.dependencies || {}),
  }));
}
