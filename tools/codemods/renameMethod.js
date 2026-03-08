"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const p = new ts_morph_1.Project();
p.addSourceFilesAtPaths('server/**/*.ts');
for (const f of p.getSourceFiles()) {
    f.getDescendantsOfKind(ts.SyntaxKind.MethodDeclaration)
        .filter((m) => m.getName() === 'retry')
        .forEach((m) => m.rename('retryWithJitter'));
}
p.saveSync();
