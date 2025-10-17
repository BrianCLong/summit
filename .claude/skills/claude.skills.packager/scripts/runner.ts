import fs from 'fs';
import path from 'path';

interface Input {
  repoPath?: string;
  context?: Record<string, any>;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export async function main(input: Input = {}) {
  const outDir = input.repoPath ?? process.cwd();
  ensureDir(outDir);
  const stamp = new Date().toISOString();
  const note = `Skill executed at ${'${stamp}'} with context: ${'${JSON.stringify(input.context||{}, null, 2)}'}`;
  fs.writeFileSync(path.join(outDir, 'SKILL_EXECUTION_NOTE.txt'), note);
  console.log('OK');
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
