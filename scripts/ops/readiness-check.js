"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const glob_1 = require("glob");
const promises_1 = require("fs/promises");
const shared_1 = require("./shared");
const child_process_1 = require("child_process");
const yaml = __importStar(require("js-yaml"));
const path = __importStar(require("path"));
async function main() {
    const packageJsonPaths = await (0, glob_1.glob)('**/package.json', { ignore: '**/node_modules/**' });
    const blockers = [];
    for (const pkgPath of packageJsonPaths) {
        const pkgContent = await (0, promises_1.readFile)(pkgPath, 'utf-8');
        const pkgJson = JSON.parse(pkgContent);
        // Check for build script
        if (!pkgJson.scripts?.build) {
            blockers.push({ id: 'P1-BUILD-001', message: 'Missing "build" script', file: pkgPath });
        }
        // Check for test script
        if (!pkgJson.scripts?.test) {
            blockers.push({ id: 'P1-TEST-002', message: 'Missing "test" script', file: pkgPath });
        }
        if (await (0, shared_1.checkMixedTestRunners)(pkgPath)) {
            blockers.push({ id: 'P1-DEBT-001', message: 'Mixed test runners (Jest and Vitest)', file: pkgPath });
        }
    }
    // Check for mobile-interface build failure
    try {
        console.log('🚀 Checking apps/mobile-interface build...');
        (0, child_process_1.execSync)('cd apps/mobile-interface && pnpm build', { stdio: 'inherit' });
    }
    catch (err) {
        blockers.push({ id: 'P0-BUILD-002', message: 'apps/mobile-interface build failed', file: 'apps/mobile-interface' });
    }
    // Check for a11y-lab test failure
    try {
        console.log('🚀 Checking apps/a11y-lab tests...');
        (0, child_process_1.execSync)('cd apps/a11y-lab && pnpm test', { stdio: 'inherit' });
    }
    catch (err) {
        blockers.push({ id: 'P1-TEST-001', message: 'apps/a11y-lab tests failed', file: 'apps/a11y-lab' });
    }
    // Check for Zod version mismatch
    try {
        console.log('🚀 Checking for Zod version mismatch...');
        const lockfilePath = path.resolve(process.cwd(), 'pnpm-lock.yaml');
        const lockfileContent = await (0, promises_1.readFile)(lockfilePath, 'utf-8');
        const lockfile = yaml.load(lockfileContent);
        const zodVersions = new Set();
        for (const key in lockfile.packages) {
            if (key.startsWith('/zod/')) {
                zodVersions.add(key.split('/')[2]);
            }
        }
        if (zodVersions.size > 1) {
            blockers.push({ id: 'P1-DEBT-002', message: `Zod version mismatch found: ${[...zodVersions].join(', ')}`, file: 'pnpm-lock.yaml' });
        }
    }
    catch (err) {
        blockers.push({ id: 'P1-DEBT-002', message: 'Failed to check for Zod version mismatch', file: 'pnpm-lock.yaml' });
    }
    if (blockers.length > 0) {
        console.error('🚨 Operational Readiness Blockers Detected:');
        blockers.forEach(blocker => {
            console.error(`  - [${blocker.id}] ${blocker.message} (in ${blocker.file})`);
        });
        process.exit(1);
    }
    else {
        console.log('✅ Operational Readiness Check Passed.');
    }
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
