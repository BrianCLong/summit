"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function main() {
    const commands = [
        'pnpm lint',
        'pnpm typecheck',
        'pnpm test',
        'pnpm test:e2e'
    ];
    for (const command of commands) {
        try {
            console.log(`🚀 Running: ${command}`);
            (0, child_process_1.execSync)(command, { stdio: 'inherit' });
        }
        catch (err) {
            console.error(`🚨 Command failed: ${command}`);
            process.exit(1);
        }
    }
    console.log('✅ CI Parity Check Passed.');
}
main();
