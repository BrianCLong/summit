"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
function scanFriction() {
    const metrics = {
        todoCount: 0,
        fixmeCount: 0,
        skippedTests: 0,
        deprecatedJustfile: false,
        timestamp: new Date().toISOString(),
    };
    try {
        const todoOutput = (0, child_process_1.execSync)('grep -r "TODO" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist || true', { encoding: 'utf-8' });
        metrics.todoCount = todoOutput.split('\n').filter(Boolean).length;
        const fixmeOutput = (0, child_process_1.execSync)('grep -r "FIXME" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist || true', { encoding: 'utf-8' });
        metrics.fixmeCount = fixmeOutput.split('\n').filter(Boolean).length;
        // Check for skipped tests in common test files
        const skippedOutput = (0, child_process_1.execSync)('grep -r "\.skip" . --include="*.test.ts" --include="*.spec.ts" --exclude-dir=node_modules --exclude-dir=.git || true', { encoding: 'utf-8' });
        metrics.skippedTests = skippedOutput.split('\n').filter(Boolean).length;
    }
    catch (error) {
        console.error('Error executing grep:', error);
    }
    if (fs_1.default.existsSync('Justfile')) {
        metrics.deprecatedJustfile = true;
    }
    return metrics;
}
const metrics = scanFriction();
console.log(JSON.stringify(metrics, null, 2));
const REPORT_PATH = 'friction-report.json';
fs_1.default.writeFileSync(REPORT_PATH, JSON.stringify(metrics, null, 2));
console.log(`Report saved to ${REPORT_PATH}`);
