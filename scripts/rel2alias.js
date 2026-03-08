#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const path_1 = __importDefault(require("path"));
const project = new ts_morph_1.Project({
    tsConfigFilePath: path_1.default.resolve('tsconfig.json'),
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
        if (!spec.startsWith('.'))
            return;
        const abs = path_1.default.resolve(path_1.default.dirname(sf.getFilePath()), spec);
        const appRoot = path_1.default.resolve('src');
        const uiRoot = path_1.default.resolve('client/src');
        if (abs.startsWith(appRoot)) {
            const rel = path_1.default.relative(appRoot, abs).replace(/\\/g, '/');
            imp.setModuleSpecifier(`@app/${rel}`);
            changed = true;
        }
        else if (abs.startsWith(uiRoot)) {
            const rel = path_1.default.relative(uiRoot, abs).replace(/\\/g, '/');
            imp.setModuleSpecifier(`@ui/${rel}`);
            changed = true;
        }
    });
    if (changed)
        sf.fixUnusedIdentifiers();
}
project.saveSync();
console.log('aliases applied');
