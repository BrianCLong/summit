"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const proj = new ts_morph_1.Project({ tsConfigFilePath: 'tsconfig.json' });
const REWRITES = {
    'lodash/isEqual': 'lodash.isequal',
    '@/utils/request': '@/core/net/request',
};
for (const sf of proj.getSourceFiles('**/*.ts*')) {
    for (const imp of sf.getImportDeclarations()) {
        const from = imp.getModuleSpecifierValue();
        if (REWRITES[from])
            imp.setModuleSpecifier(REWRITES[from]);
    }
}
await proj.save();
