"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGuard = addGuard;
const ts_morph_1 = require("ts-morph");
function addGuard(file, fn, guard) {
    const p = new ts_morph_1.Project();
    p.addSourceFileAtPath(file);
    const f = p
        .getSourceFile(file)
        .getFunctions()
        .find((x) => x.getName() === fn);
    if (!f)
        throw new Error('fn missing');
    f.addStatements(0, guard);
    p.saveSync();
}
