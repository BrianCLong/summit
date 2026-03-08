"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameAPI = renameAPI;
const ts_morph_1 = require("ts-morph");
function renameAPI(dir, from, to) {
    const p = new ts_morph_1.Project();
    p.addSourceFilesAtPaths(`${dir}/**/*.ts`);
    p.getSourceFiles().forEach((f) => f
        .getDescendantsOfKind(ts.SyntaxKind.Identifier)
        .filter((i) => i.getText() === from)
        .forEach((i) => i.replaceWithText(to)));
    p.saveSync();
}
