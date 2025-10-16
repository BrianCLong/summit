import { Project, SyntaxKind } from 'ts-morph';
export function addGuard(file: string, fn: string, guard: string) {
  const p = new Project();
  p.addSourceFileAtPath(file);
  const f = p
    .getSourceFile(file)!
    .getFunctions()
    .find((x) => x.getName() === fn);
  if (!f) throw new Error('fn missing');
  f.addStatements(0, guard);
  p.saveSync();
}
