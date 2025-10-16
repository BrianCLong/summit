import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
type MapEntry = { test: string; files: string[]; funcs: string[] };
const cov = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8')); // jest --coverage
const map: MapEntry[] = [];
for (const [file, data] of Object.entries(cov)) {
  const p = new Project({ useInMemoryFileSystem: false });
  const sf = p.addSourceFileAtPath(file);
  const funcs = sf
    .getFunctions()
    .map((f) => f.getName())
    .filter(Boolean) as string[];
  const tests = (data as any).tests?.map((t: any) => t.title) || [];
  tests.forEach((t: any) => map.push({ test: t, files: [file], funcs }));
}
fs.writeFileSync('fli-map.json', JSON.stringify(map, null, 2));
