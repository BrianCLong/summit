import { Project } from 'ts-morph';
const proj = new Project({ tsConfigFilePath: 'tsconfig.json' });
const REWRITES: Record<string, string> = {
  'lodash/isEqual': 'lodash.isequal',
  '@/utils/request': '@/core/net/request',
};
for (const sf of proj.getSourceFiles('**/*.ts*')) {
  for (const imp of sf.getImportDeclarations()) {
    const from = imp.getModuleSpecifierValue();
    if (REWRITES[from]) imp.setModuleSpecifier(REWRITES[from]);
  }
}
await proj.save();
