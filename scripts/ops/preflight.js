#!/usr/bin/env -S npx tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const args = process.argv.slice(2);
const isFast = args.includes('--fast');
console.log('🚀 Starting Preflight Check...');
function run(command, desc) {
    console.log(`\n${desc}...`);
    try {
        (0, child_process_1.execSync)(command, { stdio: 'inherit' });
        console.log(`✅ ${desc} passed`);
    }
    catch (e) {
        console.error(`❌ ${desc} failed`);
        process.exit(1);
    }
}
try {
    run('pnpm lint', 'Linting');
    run('pnpm typecheck', 'Typechecking');
    if (!isFast) {
        run('pnpm test', 'Testing');
    }
    else {
        console.log('\nTesting skipped (--fast provided).');
    }
    console.log('\n✅✅ All Preflight Checks Passed!');
}
catch (error) {
    console.error('\n❌ Preflight failed.');
    process.exit(1);
}
