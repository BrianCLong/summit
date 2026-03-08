#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const automation_js_1 = require("./automation.js");
const cli_js_1 = require("./skills/cli.js");
const summit_doctor_js_1 = require("./summit-doctor.js");
const init_js_1 = require("./adk/init.js");
const validate_js_1 = require("./adk/validate.js");
const run_js_1 = require("./adk/run.js");
const pack_js_1 = require("./adk/pack.js");
const workflow_js_1 = require("./commands/workflow.js");
function renderResult(result) {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
    console.log(`${statusIcon} ${chalk_1.default.bold(result.name)}: ${result.message}`);
    if (result.fix) {
        console.log(chalk_1.default.gray(`   Fix: ${result.fix}`));
    }
    if (result.autoFixed) {
        console.log(chalk_1.default.green('   Auto-heal applied'));
    }
}
function renderAutomationReport(report, asJson) {
    if (asJson) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }
    console.log(chalk_1.default.bold(`\n⚙️  summit ${report.workflow} workflow`));
    console.log('----------------------------------------------');
    report.results.forEach((result) => {
        const icon = result.status === 'success' ? '✅' : '❌';
        const duration = `${result.durationMs}ms`;
        console.log(`${icon} ${chalk_1.default.bold(result.name)} (${result.command}) [${duration}]`);
        if (result.stderr.trim()) {
            console.log(chalk_1.default.gray(`   stderr: ${result.stderr.trim()}`));
        }
    });
    console.log('\nSummary:');
    console.log(`  Success: ${report.summary.successCount}/${report.summary.total} | Failed: ${report.summary.failedCount} | Duration: ${report.summary.durationMs}ms`);
}
async function main() {
    const program = new commander_1.Command();
    program.name('summit').description('Summit developer toolbox CLI');
    (0, cli_js_1.registerOpenClawCommands)(program);
    (0, workflow_js_1.registerWorkflowCommands)(program);
    ['init', 'check', 'test', 'release-dry-run'].forEach((workflowName) => {
        program
            .command(workflowName)
            .description(automation_js_1.AUTOMATION_WORKFLOWS[workflowName].map((step) => step.description).join(' → '))
            .option('--json', 'Output JSON instead of human-friendly text', false)
            .action(async (options) => {
            const report = await (0, automation_js_1.runAutomationWorkflow)(workflowName);
            renderAutomationReport(report, options.json);
            if (report.summary.failedCount > 0) {
                process.exitCode = 1;
            }
        });
    });
    program
        .command('doctor')
        .description('Verify local Summit developer environment and auto-heal common issues')
        .option('--env-file <path>', 'Path to the .env file', '.env')
        .option('--fix', 'Attempt to auto-heal missing dependencies', false)
        .option('--json', 'Output JSON instead of human-friendly text', false)
        .action(async (options) => {
        const report = await (0, summit_doctor_js_1.runDoctor)({
            envFile: options.envFile,
            autoFix: options.fix,
        });
        if (options.json) {
            console.log(JSON.stringify(report, null, 2));
        }
        else {
            console.log(chalk_1.default.bold('\n🩺 Summit Doctor - local environment diagnostics'));
            console.log('----------------------------------------------');
            report.results.forEach(renderResult);
            console.log('\nSummary:');
            console.log(`  Passed: ${report.summary.passed}/${report.summary.total} | Warnings: ${report.summary.warnings} | Failed: ${report.summary.failed}`);
            if (report.summary.autoFixed > 0) {
                console.log(`  Auto-healed items: ${report.summary.autoFixed}`);
            }
            console.log(`  Env file: ${report.summary.envPath}`);
        }
        if (report.summary.failed > 0) {
            process.exitCode = 1;
        }
    });
    const adk = program
        .command('adk')
        .description('Summit Agent Development Kit (S-ADK) workflows');
    adk
        .command('init')
        .description('Create a new S-ADK agent scaffold')
        .requiredOption('--name <name>', 'Agent name')
        .action(async (options) => {
        const { manifestPath } = await (0, init_js_1.initAgentScaffold)(options.name, process.cwd());
        console.log(`Scaffold created: ${manifestPath}`);
    });
    adk
        .command('validate')
        .description('Validate an S-ADK agent manifest')
        .argument('<manifestPath>', 'Path to agent.yaml or agent.json')
        .action(async (manifestPath) => {
        const { reportPath, ok } = await (0, validate_js_1.validateManifestCommand)(manifestPath);
        console.log(`Validation report: ${reportPath}`);
        if (!ok) {
            process.exitCode = 1;
        }
    });
    adk
        .command('run')
        .description('Run an S-ADK agent locally against a fixture')
        .argument('<agentPath>', 'Path to agent directory or manifest file')
        .requiredOption('--fixture <path>', 'Fixture JSON file')
        .action(async (agentPath, options) => {
        const { evidenceId, outputDir } = await (0, run_js_1.runAgent)(agentPath, options.fixture);
        console.log(`Evidence ID: ${evidenceId}`);
        console.log(`Artifacts: ${outputDir}`);
    });
    adk
        .command('pack')
        .description('Package an S-ADK agent into a tarball')
        .argument('<agentDir>', 'Agent directory to package')
        .option('--output <path>', 'Output archive path')
        .action(async (agentDir, options) => {
        const archive = await (0, pack_js_1.packAgent)(agentDir, options.output);
        console.log(`Packed archive: ${archive}`);
    });
    await program.parseAsync(process.argv);
}
main().catch((error) => {
    console.error(chalk_1.default.red(`Summit doctor failed: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
});
