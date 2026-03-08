"use strict";
/**
 * Determinism Command
 *
 * Provides a deterministic test harness that runs CLI commands multiple times
 * and verifies byte-identical output across runs.
 */
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
exports.registerDeterminismCommands = registerDeterminismCommands;
const path = __importStar(require("path"));
const constants_js_1 = require("../lib/constants.js");
const determinism_js_1 = require("../lib/determinism.js");
/**
 * Format result for output
 */
function formatResult(result, format) {
    if (format === 'json') {
        return JSON.stringify({
            success: result.success,
            match: result.match,
            runs: result.runs.length,
            hashes: result.hashes,
            firstMismatchRun: result.firstMismatchRun,
            packageTest: result.packageTest,
            evidenceDir: result.evidenceDir,
        }, null, 2);
    }
    const lines = [];
    lines.push(`Determinism Check: ${result.match ? 'PASS' : 'FAIL'}`);
    lines.push(`Runs: ${result.runs.length}`);
    lines.push('');
    lines.push('Hashes:');
    for (let i = 0; i < result.hashes.length; i++) {
        const status = i === 0 || result.hashes[i] === result.hashes[0] ? '✓' : '✗';
        lines.push(`  ${i + 1}. ${result.hashes[i]} ${status}`);
    }
    if (!result.match && result.firstMismatchRun !== undefined) {
        lines.push('');
        lines.push(`First mismatch: Run ${result.firstMismatchRun}`);
    }
    if (result.packageTest) {
        lines.push('');
        lines.push(`Package Tests (${result.packageTest.name}):`);
        lines.push(`  Passes: ${result.packageTest.passes}/${result.packageTest.runs}`);
    }
    lines.push('');
    lines.push(`Evidence: ${result.evidenceDir}`);
    return lines.join('\n');
}
/**
 * Register determinism commands
 */
function registerDeterminismCommands(program) {
    const determinism = program
        .command('determinism')
        .description('Deterministic test harness for verifying reproducible output');
    // determinism run <command...>
    determinism
        .command('run <command> [args...]')
        .description('Run a command multiple times and verify identical output')
        .option('-n, --runs <n>', 'Number of runs', '3')
        .option('--output-dir <path>', 'Output directory for evidence')
        .option('--fail-fast', 'Stop on first mismatch', true)
        .option('--no-fail-fast', 'Continue all runs even on mismatch')
        .option('--hash <algo>', 'Hash algorithm (sha256, sha512, md5)', 'sha256')
        .option('--include-stdout', 'Store full stdout in evidence', false)
        .option('--package <name>', 'Also run package tests N times')
        .option('--require-tests-pass', 'Fail if package tests fail', false)
        .option('--include-timestamps', 'Include timestamps in output', false)
        .option('-o, --output <format>', 'Output format: text or json', 'text')
        .action(async (command, args, opts) => {
        try {
            const options = {
                runs: parseInt(opts.runs, 10),
                outputDir: opts.outputDir,
                failFast: opts.failFast,
                hashAlgo: opts.hash,
                includeStdout: opts.includeStdout,
                packageName: opts.package,
                requireTestsPass: opts.requireTestsPass,
                includeTimestamps: opts.includeTimestamps,
            };
            const result = await (0, determinism_js_1.runDeterminismHarness)(command, args, options);
            console.log(formatResult(result, opts.output));
            if (!result.success) {
                if (!result.match) {
                    process.exit(determinism_js_1.DETERMINISM_EXIT_CODES.MISMATCH);
                }
                if (result.packageTest && result.packageTest.passes < result.packageTest.runs) {
                    process.exit(determinism_js_1.DETERMINISM_EXIT_CODES.MISMATCH);
                }
            }
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(determinism_js_1.DETERMINISM_EXIT_CODES.UNEXPECTED_ERROR);
        }
    });
    // determinism verify <evidence-dir>
    determinism
        .command('verify <evidence-dir>')
        .description('Verify evidence from a previous determinism run')
        .option('-o, --output <format>', 'Output format: text or json', 'text')
        .action(async (evidenceDir, opts) => {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const evidencePath = path.join(evidenceDir, 'evidence.json');
            if (!fs.existsSync(evidencePath)) {
                console.error(`Evidence not found: ${evidencePath}`);
                process.exit(constants_js_1.EXIT_CODES.GENERAL_ERROR);
            }
            const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
            if (opts.output === 'json') {
                console.log(JSON.stringify(evidence, null, 2));
            }
            else {
                console.log(`Command: ${evidence.command}`);
                console.log(`Runs: ${evidence.runs}`);
                console.log(`Match: ${evidence.match ? 'Yes' : 'No'}`);
                console.log(`Hash Algorithm: ${evidence.hash_algo}`);
                console.log('');
                console.log('Hashes:');
                for (let i = 0; i < evidence.hashes.length; i++) {
                    console.log(`  ${i + 1}. ${evidence.hashes[i]}`);
                }
                if (evidence.package_test) {
                    console.log('');
                    console.log(`Package: ${evidence.package_test.name}`);
                    console.log(`Test Passes: ${evidence.package_test.passes}/${evidence.package_test.runs}`);
                }
            }
            if (!evidence.match) {
                process.exit(determinism_js_1.DETERMINISM_EXIT_CODES.MISMATCH);
            }
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(determinism_js_1.DETERMINISM_EXIT_CODES.UNEXPECTED_ERROR);
        }
    });
    // determinism clean [--max-age-days <days>]
    determinism
        .command('clean')
        .description('Clean old determinism evidence directories')
        .option('--max-age-days <days>', 'Maximum age of evidence to keep', '7')
        .action(async (opts) => {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const determinismDir = path.join(process.cwd(), '.claude', 'determinism');
            if (!fs.existsSync(determinismDir)) {
                console.log('No determinism evidence found.');
                return;
            }
            const maxAgeMs = parseInt(opts.maxAgeDays, 10) * 24 * 60 * 60 * 1000;
            const cutoff = Date.now() - maxAgeMs;
            const dirs = fs.readdirSync(determinismDir);
            let cleaned = 0;
            for (const dir of dirs) {
                const dirPath = path.join(determinismDir, dir);
                const stat = fs.statSync(dirPath);
                if (stat.isDirectory() && stat.mtimeMs < cutoff) {
                    fs.rmSync(dirPath, { recursive: true, force: true });
                    cleaned++;
                }
            }
            console.log(`Cleaned ${cleaned} evidence director${cleaned === 1 ? 'y' : 'ies'}.`);
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(constants_js_1.EXIT_CODES.GENERAL_ERROR);
        }
    });
}
