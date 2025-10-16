import { Project, SyntaxKind } from 'ts-morph';
const proj = new Project({ tsConfigFilePath: 'tsconfig.json' });
for (const sf of proj.getSourceFiles('**/*.ts*')) {
  sf.forEachDescendant((n) => {
    if (n.getKind() === SyntaxKind.CallExpression) {
      const txt = n.getText();
      if (/\.then\(/.test(txt) && !txt.includes('catch(')) {
        n.replaceWithText(`${txt}.catch(e=>logger.error("unhandled", {e}))`);
      }
    }
  });
}
await proj.save();
