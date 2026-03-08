"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMixedTestRunners = checkMixedTestRunners;
const promises_1 = require("fs/promises");
async function checkMixedTestRunners(pkgPath) {
    const pkgContent = await (0, promises_1.readFile)(pkgPath, 'utf-8');
    const pkgJson = JSON.parse(pkgContent);
    const devDependencies = pkgJson.devDependencies || {};
    return 'jest' in devDependencies && 'vitest' in devDependencies;
}
