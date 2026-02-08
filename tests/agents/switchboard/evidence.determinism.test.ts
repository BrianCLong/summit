import fs from 'node:fs';
import path from 'node:path';

type WalkEntry = {
  path: string;
  isDirectory: boolean;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  const entries: WalkEntry[] = fs
    .readdirSync(dir, { withFileTypes: true })
    .map((entry) => ({
      path: path.join(dir, entry.name),
      isDirectory: entry.isDirectory(),
    }));

  for (const entry of entries) {
    if (entry.isDirectory) {
      out.push(...walk(entry.path));
    } else {
      out.push(entry.path);
    }
  }

  return out;
}

describe('switchboard evidence determinism', () => {
  it('forbids timestamps outside stamp.json', () => {
    const evidenceDir = path.join(process.cwd(), 'evidence');
    if (!fs.existsSync(evidenceDir)) return;

    const files = walk(evidenceDir);
    const forbidden = files.filter((file) => {
      const base = path.basename(file);
      if (base === 'stamp.json') return false;
      if (!base.endsWith('.json')) return false;
      const txt = fs.readFileSync(file, 'utf8');
      return /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/.test(txt);
    });

    expect(forbidden).toEqual([]);
  });
});
