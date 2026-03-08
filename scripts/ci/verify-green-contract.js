"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const glob_1 = require("glob");
const shared_1 = require("../ops/shared");
async function main() {
    const packageJsonPaths = await (0, glob_1.glob)('**/package.json', { ignore: '**/node_modules/**' });
    const violations = [];
    for (const pkgPath of packageJsonPaths) {
        if (await (0, shared_1.checkMixedTestRunners)(pkgPath)) {
            violations.push({ id: 'GREEN-CI-001', message: 'Mixed test runners (Jest and Vitest)', file: pkgPath });
        }
    }
    if (violations.length > 0) {
        console.error('🚨 Green CI Contract Violations Detected:');
        violations.forEach(violation => {
            console.error(`  - [${violation.id}] ${violation.message} (in ${violation.file})`);
        });
        process.exit(1);
    }
    else {
        console.log('✅ Green CI Contract Verified.');
    }
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
