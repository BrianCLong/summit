import { Project } from 'ts-morph';
const p = new Project();
p.addSourceFilesAtPaths('server/**/*.ts');
for (const f of p.getSourceFiles()) {
  f.getDescendantsOfKind(ts.SyntaxKind.MethodDeclaration)
    .filter((m) => m.getName() === 'retry')
    .forEach((m) => m.rename('retryWithJitter'));
}
p.saveSync();
