#!/usr/bin/env tsx
"use strict";
/**
 * Promise Tracker CLI
 *
 * Main entry point for the promise tracking system.
 *
 * Commands:
 *   extract   - Scan codebase for promises/TODOs
 *   report    - Generate backlog health report
 *   sync      - Sync staging items to GitHub issues
 *   health    - Show backlog health metrics
 *   init      - Initialize promise tracker in a repo
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const extract_js_1 = require("./extract.js");
const report_js_1 = require("./report.js");
const health_js_1 = require("./health.js");
const sync_js_1 = require("./sync.js");
const init_js_1 = require("./init.js");
const program = new commander_1.Command();
program
    .name('promise-tracker')
    .description('Track promises from docs to production')
    .version('1.0.0');
// =============================================================================
// Extract Command
// =============================================================================
program
    .command('extract')
    .description('Scan codebase for promises, TODOs, and commitments')
    .option('-o, --output <path>', 'Output file path', '.promise-tracker/staging.json')
    .option('--code-only', 'Only scan code files')
    .option('--docs-only', 'Only scan documentation')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options) => {
    console.log(chalk_1.default.blue('\n=== Promise Tracker: Extract ===\n'));
    try {
        const result = await (0, extract_js_1.extractPromises)();
        console.log(chalk_1.default.green(`\nExtraction complete!`));
        console.log(`  Total items found: ${chalk_1.default.bold(result.staging.length)}`);
        console.log(`  Code TODOs: ${result.stats.todosFound}`);
        console.log(`  Doc commitments: ${result.stats.commitmentsFound}`);
        console.log(`  Checklist items: ${result.stats.checklistItemsFound}`);
        if (options.verbose) {
            console.log('\n' + chalk_1.default.gray('Sample items:'));
            result.staging.slice(0, 5).forEach((item, i) => {
                console.log(chalk_1.default.gray(`  ${i + 1}. [${item.component}] ${item.rough_title.slice(0, 60)}...`));
            });
        }
        console.log(chalk_1.default.gray(`\nOutput: ${options.output}`));
    }
    catch (error) {
        console.error(chalk_1.default.red('Extraction failed:'), error);
        process.exit(1);
    }
});
// =============================================================================
// Report Command
// =============================================================================
program
    .command('report')
    .description('Generate backlog health report')
    .option('-f, --format <format>', 'Output format: json, markdown, table', 'table')
    .option('-o, --output <path>', 'Output file path')
    .action(async (options) => {
    console.log(chalk_1.default.blue('\n=== Promise Tracker: Report ===\n'));
    try {
        const report = await (0, report_js_1.generateReport)(options.format);
        console.log(report);
        if (options.output) {
            const { writeFileSync } = await Promise.resolve().then(() => __importStar(require('fs')));
            writeFileSync(options.output, report);
            console.log(chalk_1.default.gray(`\nReport written to: ${options.output}`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Report generation failed:'), error);
        process.exit(1);
    }
});
// =============================================================================
// Health Command
// =============================================================================
program
    .command('health')
    .description('Show backlog health metrics')
    .option('--ci', 'CI mode - exit with error if health thresholds not met')
    .action(async (options) => {
    console.log(chalk_1.default.blue('\n=== Promise Tracker: Health ===\n'));
    try {
        const health = await (0, health_js_1.generateHealthMetrics)();
        // Display health dashboard
        console.log(chalk_1.default.bold('Backlog Health Dashboard\n'));
        console.log(`Total Items: ${chalk_1.default.bold(health.total_items)}`);
        console.log(`Doc-Only (not implemented): ${chalk_1.default.yellow(health.doc_only_count)}`);
        console.log(`Stale In-Progress (>14d): ${health.stale_in_progress > 0 ? chalk_1.default.red(health.stale_in_progress) : chalk_1.default.green(health.stale_in_progress)}`);
        console.log(`Missing Acceptance Criteria: ${health.missing_acceptance_criteria > 0 ? chalk_1.default.yellow(health.missing_acceptance_criteria) : chalk_1.default.green(health.missing_acceptance_criteria)}`);
        console.log(`Validation Rate: ${health.validated_rate >= 80 ? chalk_1.default.green(health.validated_rate + '%') : chalk_1.default.yellow(health.validated_rate + '%')}`);
        console.log(chalk_1.default.bold('\nBy Status:'));
        Object.entries(health.by_status).forEach(([status, count]) => {
            const color = status === 'validated' ? chalk_1.default.green : status === 'blocked' ? chalk_1.default.red : chalk_1.default.white;
            console.log(`  ${status}: ${color(count)}`);
        });
        console.log(chalk_1.default.bold('\nBy Component:'));
        Object.entries(health.by_component)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([component, count]) => {
            console.log(`  ${component}: ${count}`);
        });
        // CI mode - check thresholds
        if (options.ci) {
            const issues = [];
            if (health.stale_in_progress > 5) {
                issues.push(`Too many stale in-progress items: ${health.stale_in_progress}`);
            }
            if (health.validated_rate < 50) {
                issues.push(`Validation rate too low: ${health.validated_rate}%`);
            }
            if (issues.length > 0) {
                console.log(chalk_1.default.red('\n=== Health Check Failed ==='));
                issues.forEach((issue) => console.log(chalk_1.default.red(`  - ${issue}`)));
                process.exit(1);
            }
            console.log(chalk_1.default.green('\n=== Health Check Passed ==='));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Health check failed:'), error);
        process.exit(1);
    }
});
// =============================================================================
// Sync Command
// =============================================================================
program
    .command('sync')
    .description('Sync staging items to GitHub issues')
    .option('--dry-run', 'Show what would be created without actually creating')
    .option('--limit <n>', 'Limit number of issues to create', '10')
    .option('--component <component>', 'Only sync items for specific component')
    .action(async (options) => {
    console.log(chalk_1.default.blue('\n=== Promise Tracker: Sync ===\n'));
    try {
        const result = await (0, sync_js_1.syncToGitHub)({
            dryRun: options.dryRun,
            limit: parseInt(options.limit, 10),
            component: options.component,
        });
        if (options.dryRun) {
            console.log(chalk_1.default.yellow('DRY RUN - No issues created\n'));
        }
        console.log(`Issues ${options.dryRun ? 'would be ' : ''}created: ${result.created}`);
        console.log(`Issues ${options.dryRun ? 'would be ' : ''}updated: ${result.updated}`);
        console.log(`Skipped (already exists): ${result.skipped}`);
        if (result.errors.length > 0) {
            console.log(chalk_1.default.red('\nErrors:'));
            result.errors.forEach((err) => console.log(chalk_1.default.red(`  - ${err}`)));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Sync failed:'), error);
        process.exit(1);
    }
});
// =============================================================================
// Init Command
// =============================================================================
program
    .command('init')
    .description('Initialize promise tracker in the repository')
    .action(async () => {
    console.log(chalk_1.default.blue('\n=== Promise Tracker: Initialize ===\n'));
    try {
        await (0, init_js_1.initializeTracker)();
        console.log(chalk_1.default.green('Promise tracker initialized successfully!'));
        console.log(chalk_1.default.gray('\nNext steps:'));
        console.log(chalk_1.default.gray('  1. Run `pnpm promise-tracker extract` to scan for promises'));
        console.log(chalk_1.default.gray('  2. Review .promise-tracker/staging.json'));
        console.log(chalk_1.default.gray('  3. Run `pnpm promise-tracker sync --dry-run` to preview GitHub sync'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Initialization failed:'), error);
        process.exit(1);
    }
});
// =============================================================================
// Parse and Run
// =============================================================================
program.parse();
