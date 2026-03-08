#!/usr/bin/env node
"use strict";
/**
 * Maestro CLI - Command Line Interface for Workflow Orchestration
 * Provides local development parity with remote execution
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const fs_1 = require("fs");
const path_1 = require("path");
const js_yaml_1 = __importDefault(require("js-yaml"));
const init_1 = require("./commands/init");
const plan_1 = require("./commands/plan");
const run_1 = require("./commands/run");
const deploy_1 = require("./commands/deploy");
const status_1 = require("./commands/status");
const logs_1 = require("./commands/logs");
const config_1 = require("./commands/config");
const template_1 = require("./commands/template");
const dsar_1 = require("./commands/dsar");
const release_1 = require("./commands/release");
const program = new commander_1.Command();
exports.program = program;
// ASCII art banner
const banner = figlet_1.default.textSync('Maestro', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
});
program
    .name('maestro')
    .description('🎼 Maestro - AI-Powered Build Orchestration Platform')
    .version(getVersion())
    .option('-v, --verbose', 'Enable verbose output')
    .option('--no-color', 'Disable colored output')
    .option('--config <path>', 'Path to configuration file')
    .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    // Disable colors if requested
    if (opts.noColor) {
        chalk_1.default.level = 0;
    }
    // Set global verbose flag
    process.env.MAESTRO_VERBOSE = opts.verbose ? 'true' : 'false';
});
// Initialize command
program
    .command('init')
    .description('Initialize a new Maestro workflow')
    .option('-t, --template <name>', 'Use a specific template')
    .option('-d, --directory <path>', 'Target directory')
    .option('--interactive', 'Interactive setup wizard')
    .action(async (options) => {
    console.log(chalk_1.default.blue(banner));
    console.log(chalk_1.default.gray('Build orchestration that just works\n'));
    const initCmd = new init_1.InitCommand();
    await initCmd.execute(options);
});
// Plan command
program
    .command('plan')
    .description('Validate and plan workflow execution')
    .option('-f, --file <path>', 'Workflow file path', 'maestro.yaml')
    .option('--dry-run', 'Show execution plan without running')
    .option('--output <format>', 'Output format (json|yaml|table)', 'table')
    .action(async (options) => {
    const planCmd = new plan_1.PlanCommand();
    await planCmd.execute(options);
});
// Run command
program
    .command('run')
    .description('Execute workflow locally or remotely')
    .option('-f, --file <path>', 'Workflow file path', 'maestro.yaml')
    .option('--local', 'Run locally using Docker')
    .option('--remote', 'Run on remote Maestro cluster')
    .option('-e, --env <name>', 'Environment name', 'development')
    .option('-p, --param <key=value...>', 'Workflow parameters')
    .option('--watch', 'Watch for file changes and re-run')
    .option('--parallel <number>', 'Maximum parallel steps', '3')
    .action(async (options) => {
    const runCmd = new run_1.RunCommand();
    await runCmd.execute(options);
});
// Deploy command
program
    .command('deploy')
    .description('Deploy workflow to Maestro cluster')
    .option('-f, --file <path>', 'Workflow file path', 'maestro.yaml')
    .option('-e, --env <name>', 'Target environment', 'staging')
    .option('--namespace <name>', 'Kubernetes namespace')
    .option('--wait', 'Wait for deployment completion')
    .option('--rollback', 'Rollback previous deployment')
    .action(async (options) => {
    const deployCmd = new deploy_1.DeployCommand();
    await deployCmd.execute(options);
});
// Status command
program
    .command('status')
    .description('Show workflow execution status')
    .option('-r, --run-id <id>', 'Specific run ID')
    .option('-f, --follow', 'Follow status updates')
    .option('--format <format>', 'Output format (json|yaml|table)', 'table')
    .action(async (options) => {
    const statusCmd = new status_1.StatusCommand();
    await statusCmd.execute(options);
});
// Logs command
program
    .command('logs')
    .description('Show workflow execution logs')
    .option('-r, --run-id <id>', 'Specific run ID')
    .option('-s, --step <name>', 'Specific step name')
    .option('-f, --follow', 'Follow log output')
    .option('--tail <lines>', 'Number of lines to show', '100')
    .option('--since <time>', 'Show logs since timestamp')
    .action(async (options) => {
    const logsCmd = new logs_1.LogsCommand();
    await logsCmd.execute(options);
});
// Config command
program
    .command('config')
    .description('Manage Maestro configuration')
    .addCommand(new commander_1.Command('get')
    .description('Get configuration value')
    .argument('<key>', 'Configuration key')
    .action(async (key) => {
    const configCmd = new config_1.ConfigCommand();
    await configCmd.get(key);
}))
    .addCommand(new commander_1.Command('set')
    .description('Set configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .option('--global', 'Set global configuration')
    .action(async (key, value, options) => {
    const configCmd = new config_1.ConfigCommand();
    await configCmd.set(key, value, options);
}))
    .addCommand(new commander_1.Command('list')
    .description('List all configuration')
    .option('--global', 'Show global configuration')
    .action(async (options) => {
    const configCmd = new config_1.ConfigCommand();
    await configCmd.list(options);
}));
// Template command
program
    .command('template')
    .description('Manage workflow templates')
    .addCommand(new commander_1.Command('list')
    .description('List available templates')
    .option('--remote', 'List remote templates')
    .action(async (options) => {
    const templateCmd = new template_1.TemplateCommand();
    await templateCmd.list(options);
}))
    .addCommand(new commander_1.Command('show')
    .description('Show template details')
    .argument('<name>', 'Template name')
    .action(async (name) => {
    const templateCmd = new template_1.TemplateCommand();
    await templateCmd.show(name);
}))
    .addCommand(new commander_1.Command('create')
    .description('Create new template from current workflow')
    .argument('<name>', 'Template name')
    .option('-d, --description <text>', 'Template description')
    .action(async (name, options) => {
    const templateCmd = new template_1.TemplateCommand();
    await templateCmd.create(name, options);
}));
// Register DSAR commands
(0, dsar_1.registerDsarCommands)(program);
// Register Release commands
(0, release_1.registerReleaseCommands)(program);
// Development commands
const devCommand = new commander_1.Command('dev').description('Development utilities');
devCommand
    .command('validate')
    .description('Validate workflow syntax')
    .option('-f, --file <path>', 'Workflow file path', 'maestro.yaml')
    .action(async (options) => {
    try {
        const content = (0, fs_1.readFileSync)(options.file, 'utf8');
        const workflow = js_yaml_1.default.load(content);
        console.log(chalk_1.default.green('✓'), 'Workflow syntax is valid');
        console.log(chalk_1.default.gray(`  Name: ${workflow.name}`));
        console.log(chalk_1.default.gray(`  Version: ${workflow.version}`));
        console.log(chalk_1.default.gray(`  Steps: ${workflow.stages?.flatMap((s) => s.steps || []).length || 0}`));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗'), 'Workflow validation failed:');
        console.error(chalk_1.default.red(`  ${error.message}`));
        process.exit(1);
    }
});
devCommand
    .command('generate')
    .description('Generate workflow scaffolding')
    .option('-t, --type <type>', 'Workflow type (api|scraping|build|test)', 'build')
    .option('-o, --output <path>', 'Output file path', 'maestro.yaml')
    .action(async (options) => {
    const templates = {
        api: {
            name: 'api-workflow',
            version: '1.0.0',
            stages: [
                {
                    name: 'fetch',
                    steps: [
                        {
                            run: 'api.request',
                            with: {
                                url: 'https://api.example.com/data',
                                method: 'GET',
                                headers: { Accept: 'application/json' },
                            },
                        },
                    ],
                },
            ],
        },
        scraping: {
            name: 'scraping-workflow',
            version: '1.0.0',
            stages: [
                {
                    name: 'scrape',
                    steps: [
                        {
                            run: 'web_scraper',
                            with: {
                                url: 'https://example.com',
                                extract: {
                                    type: 'html',
                                    selector: 'h1',
                                    multiple: false,
                                },
                            },
                        },
                    ],
                },
            ],
        },
        build: {
            name: 'build-workflow',
            version: '1.0.0',
            stages: [
                {
                    name: 'install',
                    steps: [{ run: 'shell', with: { command: 'npm install' } }],
                },
                {
                    name: 'test',
                    steps: [{ run: 'shell', with: { command: 'npm test' } }],
                },
                {
                    name: 'build',
                    steps: [{ run: 'shell', with: { command: 'npm run build' } }],
                },
            ],
        },
    };
    const template = templates[options.type];
    if (!template) {
        console.error(chalk_1.default.red('✗'), `Unknown workflow type: ${options.type}`);
        process.exit(1);
    }
    const yamlContent = js_yaml_1.default.dump(template, { indent: 2 });
    (0, fs_1.writeFileSync)(options.output, yamlContent);
    console.log(chalk_1.default.green('✓'), `Generated ${options.type} workflow: ${options.output}`);
});
program.addCommand(devCommand);
// Global error handler
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('Unhandled Rejection at:'), promise, chalk_1.default.red('reason:'), reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('Uncaught Exception:'), error);
    process.exit(1);
});
// Helper functions
function getVersion() {
    try {
        const packageJson = (0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, '../package.json'), 'utf8');
        return JSON.parse(packageJson).version;
    }
    catch {
        return '1.0.0';
    }
}
// Auto-update check
async function checkForUpdates() {
    if (process.env.MAESTRO_SKIP_UPDATE_CHECK === 'true') {
        return;
    }
    try {
        const currentVersion = getVersion();
        const { spawn } = require('child_process');
        const child = spawn('npm', ['view', '@intelgraph/maestro', 'version'], {
            stdio: 'pipe',
            timeout: 3000,
        });
        child.stdout.on('data', (data) => {
            const latestVersion = data.toString().trim();
            if (latestVersion !== currentVersion) {
                console.log(chalk_1.default.yellow('\n📦 New version available!'));
                console.log(chalk_1.default.gray(`   Current: ${currentVersion}`));
                console.log(chalk_1.default.gray(`   Latest:  ${latestVersion}`));
                console.log(chalk_1.default.gray(`   Run: npm install -g @intelgraph/maestro@latest\n`));
            }
        });
    }
    catch {
        // Silently ignore update check failures
    }
}
// Main execution
async function main() {
    // Show banner for help command or when no arguments
    if (process.argv.length === 2 ||
        process.argv.includes('--help') ||
        process.argv.includes('-h')) {
        console.log(chalk_1.default.blue(banner));
        console.log(chalk_1.default.gray('Build orchestration that just works\n'));
    }
    // Check for updates in background
    setImmediate(checkForUpdates);
    // Parse and execute
    await program.parseAsync(process.argv);
}
// Only run if this is the main module
if (require.main === module) {
    main().catch((error) => {
        console.error(chalk_1.default.red('Error:'), error.message);
        if (process.env.MAESTRO_VERBOSE === 'true') {
            console.error(error.stack);
        }
        process.exit(1);
    });
}
