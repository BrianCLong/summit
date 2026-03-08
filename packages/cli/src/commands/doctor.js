"use strict";
/**
 * Summit CLI Doctor Command
 *
 * Environment and configuration diagnostics.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctor = exports.doctorCommand = void 0;
exports.runDoctorChecks = runDoctorChecks;
exports.formatDoctorResults = formatDoctorResults;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = require("fs");
const path_1 = require("path");
const config_js_1 = require("../config.js");
const REQUIRED_ENVIRONMENT = [
    { env: 'SUMMIT_API_URL', configKey: 'baseUrl', label: 'API base URL', critical: true },
    { env: 'SUMMIT_API_KEY', configKey: 'apiKey', label: 'API key or token', critical: true },
    { env: 'SUMMIT_TENANT_ID', configKey: 'tenantId', label: 'Tenant ID' },
];
const SCHEMA_FILES = ['baseline.graphql', 'placement.graphql', 'prov-ledger.graphql'];
async function runDoctorChecks(options) {
    const schemaDir = options?.schemaDir ?? 'schema';
    await (0, config_js_1.loadConfig)();
    const config = (0, config_js_1.getConfig)();
    const results = [];
    for (const requirement of REQUIRED_ENVIRONMENT) {
        const value = process.env[requirement.env] ?? config[requirement.configKey];
        const source = process.env[requirement.env] ? 'environment' : 'configuration';
        if (value) {
            results.push({
                id: `env-${String(requirement.env).toLowerCase()}`,
                label: `${requirement.label} (${requirement.env})`,
                status: 'PASS',
                details: `Resolved from ${source}.`,
            });
        }
        else {
            results.push({
                id: `env-${String(requirement.env).toLowerCase()}`,
                label: `${requirement.label} (${requirement.env})`,
                status: 'FAIL',
                details: `${requirement.env} is not set and no saved ${requirement.configKey} value was found.`,
                action: requirement.critical
                    ? `Run \`summit config init\` or set ${requirement.env} in your environment.`
                    : `Set ${requirement.env} if your deployment requires it.`,
                critical: Boolean(requirement.critical),
            });
        }
    }
    const baseUrl = process.env.SUMMIT_API_URL ?? config.baseUrl;
    if (baseUrl) {
        try {
            new URL(baseUrl);
            results.push({
                id: 'connectivity',
                label: 'API connectivity (simulated)',
                status: 'PASS',
                details: `Validated API URL format: ${baseUrl}`,
            });
        }
        catch (error) {
            results.push({
                id: 'connectivity',
                label: 'API connectivity (simulated)',
                status: 'FAIL',
                details: `Invalid API URL: ${error.message}`,
                action: 'Update SUMMIT_API_URL or the configured baseUrl to a valid URL.',
                critical: true,
            });
        }
    }
    else {
        results.push({
            id: 'connectivity',
            label: 'API connectivity (simulated)',
            status: 'FAIL',
            details: 'No API URL configured for connectivity simulation.',
            action: "Set SUMMIT_API_URL or run `summit config init` to provide a base URL.",
            critical: true,
        });
    }
    for (const schemaFile of SCHEMA_FILES) {
        const fullPath = (0, path_1.join)(process.cwd(), schemaDir, schemaFile);
        if ((0, fs_1.existsSync)(fullPath)) {
            results.push({
                id: `schema-${schemaFile}`,
                label: `Schema file ${schemaFile}`,
                status: 'PASS',
                details: fullPath,
            });
        }
        else {
            results.push({
                id: `schema-${schemaFile}`,
                label: `Schema file ${schemaFile}`,
                status: 'FAIL',
                details: `${schemaDir}/${schemaFile} was not found.`,
                action: `Restore the schema file or point --schema-dir to the correct location.`,
                critical: true,
            });
        }
    }
    const criticalFailures = results.filter((result) => result.critical && result.status === 'FAIL').length;
    return { results, exitCode: criticalFailures > 0 ? 1 : 0 };
}
function formatDoctorResults(results) {
    const lines = [chalk_1.default.bold('\nSummit CLI Doctor\n')];
    for (const result of results) {
        const statusLabel = result.status === 'PASS'
            ? chalk_1.default.green('PASS')
            : result.status === 'WARN'
                ? chalk_1.default.yellow('WARN')
                : chalk_1.default.red('FAIL');
        const details = result.details ? `: ${result.details}` : '';
        lines.push(`${statusLabel} ${result.label}${details}`);
        if (result.action) {
            lines.push(chalk_1.default.dim(`  → ${result.action}`));
        }
    }
    const criticalIssues = results.filter((result) => result.critical && result.status === 'FAIL').length;
    lines.push(criticalIssues > 0
        ? chalk_1.default.red(`\nFound ${criticalIssues} critical issue(s). CLI will exit with status 1.`)
        : chalk_1.default.green('\nAll critical checks passed.'));
    return lines.join('\n');
}
exports.doctorCommand = new commander_1.Command('doctor')
    .description('Check local environment, configuration, and schema readiness')
    .option('--schema-dir <path>', 'Override schema directory location', 'schema')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
    const { results, exitCode } = await runDoctorChecks({ schemaDir: options.schemaDir });
    if (options.json) {
        console.log(JSON.stringify({ results, exitCode }, null, 2));
        process.exit(exitCode);
    }
    console.log(formatDoctorResults(results));
    process.exit(exitCode);
});
exports.doctor = exports.doctorCommand;
