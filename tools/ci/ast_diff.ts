import { Project } from 'ts-morph';
import { execSync } from 'child_process';
import fs from 'fs';
const base = process.env.GITHUB_BASE_REF || 'origin/main';
const files = execSync(`git diff --name-only ${base}...HEAD -- '*.ts' '*.tsx'`)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);
const pOld = new Project(),
  pNew = new Project();
const out: Record<string, string[]> = {};
for (const f of files) {
  try {
    const old = execSync(`git show ${base}:${f}`, { stdio: 'pipe' }).toString();
    const neu = execSync(`cat ${f}`, { stdio: 'pipe' }).toString();
    const sOld = pOld.createSourceFile('old/' + f, old, { overwrite: true });
    const sNew = pNew.createSourceFile('new/' + f, neu, { overwrite: true });
    const funcsNew = new Set(
      sNew
        .getFunctions()
        .map((fn) => fn.getName())
        .filter(Boolean) as string[],
    );
    const funcsOld = new Set(
      sOld
        .getFunctions()
        .map((fn) => fn.getName())
        .filter(Boolean) as string[],
    );
    const changed = [...new Set([...funcsNew, ...funcsOld])].filter(
      (n) =>
        JSON.stringify(sOld.getFunction(n)?.getText() || '') !==
        JSON.stringify(sNew.getFunction(n)?.getText() || ''),
    );
    if (changed.length) out[f] = changed;
  } catch {}
}
fs.writeFileSync('changed_ast.json', JSON.stringify(out, null, 2));
