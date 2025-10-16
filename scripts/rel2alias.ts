#!/usr/bin/env ts-node
import { Project } from 'ts-morph';
import path from 'path';

const project = new Project({
  tsConfigFilePath: path.resolve('tsconfig.json'),
});
const files = project.getSourceFiles([
  'src/**/*.ts',
  'client/src/**/*.ts',
  'client/src/**/*.tsx',
]);

for (const sf of files) {
  let changed = false;
  sf.getImportDeclarations().forEach((imp) => {
    const spec = imp.getModuleSpecifierValue();
    if (!spec.startsWith('.')) return;
    const abs = path.resolve(path.dirname(sf.getFilePath()), spec);
    const appRoot = path.resolve('src');
    const uiRoot = path.resolve('client/src');
    if (abs.startsWith(appRoot)) {
      const rel = path.relative(appRoot, abs).replace(/\\/g, '/');
      imp.setModuleSpecifier(`@app/${rel}`);
      changed = true;
    } else if (abs.startsWith(uiRoot)) {
      const rel = path.relative(uiRoot, abs).replace(/\\/g, '/');
      imp.setModuleSpecifier(`@ui/${rel}`);
      changed = true;
    }
  });
  if (changed) sf.fixUnusedIdentifiers();
}

project.saveSync();
console.log('aliases applied');
