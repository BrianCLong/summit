import { Project } from 'ts-morph';
export function renameAPI(dir: string, from: string, to: string) {
  const p = new Project();
  p.addSourceFilesAtPaths(`${dir}/**/*.ts`);
  p.getSourceFiles().forEach((f) =>
    f
      .getDescendantsOfKind(ts.SyntaxKind.Identifier)
      .filter((i) => i.getText() === from)
      .forEach((i) => i.replaceWithText(to)),
  );
  p.saveSync();
}
