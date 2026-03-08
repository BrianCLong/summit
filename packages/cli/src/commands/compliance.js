"use strict";
/**
 * Summit CLI Compliance Commands
 *
 * Compliance management commands.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module @summit/cli/commands/compliance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceCommands = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const client_js_1 = require("../client.js");
const utils_js_1 = require("../utils.js");
/**
 * Get compliance summary
 */
const summary = new commander_1.Command('summary')
    .description('Get compliance summary for a framework')
    .argument('[framework]', 'Framework (SOC2, ISO27001, GDPR, HIPAA)', 'SOC2')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (framework, options) => {
    const response = await (0, client_js_1.get)(`/compliance/frameworks/${framework}/summary`);
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    const s = response.data;
    console.log(chalk_1.default.bold(`\n${framework} Compliance Summary\n`));
    // Overall score with color
    const scoreColor = s.overallScore >= 80 ? chalk_1.default.green :
        s.overallScore >= 60 ? chalk_1.default.yellow : chalk_1.default.red;
    console.log(`Overall Score: ${scoreColor(s.overallScore + '%')}`);
    console.log(`Status:        ${s.status}`);
    console.log(chalk_1.default.bold('\nControl Summary:'));
    console.log(`  ${chalk_1.default.green('✓')} Compliant:     ${s.controlSummary.compliant}`);
    console.log(`  ${chalk_1.default.yellow('◐')} Partial:       ${s.controlSummary.partial}`);
    console.log(`  ${chalk_1.default.red('✗')} Non-Compliant: ${s.controlSummary.nonCompliant}`);
    console.log(`  ${chalk_1.default.gray('○')} Not Assessed:  ${s.controlSummary.notAssessed}`);
    if (s.categoryBreakdown?.length > 0) {
        console.log(chalk_1.default.bold('\nCategory Breakdown:'));
        s.categoryBreakdown.forEach((cat) => {
            const catColor = cat.score >= 80 ? chalk_1.default.green :
                cat.score >= 60 ? chalk_1.default.yellow : chalk_1.default.red;
            const bar = '█'.repeat(Math.floor(cat.score / 5)) + '░'.repeat(20 - Math.floor(cat.score / 5));
            console.log(`  ${cat.category.padEnd(25)} ${bar} ${catColor(cat.score + '%')}`);
        });
    }
});
/**
 * List controls
 */
const controls = new commander_1.Command('controls')
    .description('List controls for a framework')
    .argument('[framework]', 'Framework (SOC2, ISO27001, GDPR, HIPAA)', 'SOC2')
    .option('-c, --category <category>', 'Filter by category')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (framework, options) => {
    const params = {};
    if (options.category)
        params.category = options.category;
    const response = await (0, client_js_1.get)(`/compliance/frameworks/${framework}/controls`, params);
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    if (response.data.length === 0) {
        console.log(chalk_1.default.yellow('No controls found.'));
        return;
    }
    console.log(chalk_1.default.bold(`\n${framework} Controls\n`));
    console.log((0, utils_js_1.formatOutput)(response.data, ['id', 'name', 'category', 'frequency']));
});
/**
 * Assess a control
 */
const assess = new commander_1.Command('assess')
    .description('Trigger assessment for a control')
    .argument('<framework>', 'Framework (SOC2, ISO27001, GDPR, HIPAA)')
    .argument('<controlId>', 'Control ID to assess')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (framework, controlId, options) => {
    console.log(chalk_1.default.blue(`Assessing control ${controlId}...`));
    const response = await (0, client_js_1.post)(`/compliance/frameworks/${framework}/assess/${controlId}`, {});
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    const a = response.data;
    console.log(chalk_1.default.bold(`\nAssessment Result for ${controlId}\n`));
    const statusColor = a.status === 'compliant' ? chalk_1.default.green :
        a.status === 'partial' ? chalk_1.default.yellow : chalk_1.default.red;
    console.log(`Status: ${statusColor(a.status)}`);
    console.log(`Score:  ${a.score}%`);
    if (a.findings.length > 0) {
        console.log(chalk_1.default.bold('\nFindings:'));
        a.findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }
    if (a.evidence.length > 0) {
        console.log(chalk_1.default.bold('\nEvidence Collected:'));
        a.evidence.forEach((e) => console.log(`  - ${e}`));
    }
});
/**
 * List evidence
 */
const evidence = new commander_1.Command('evidence')
    .description('List compliance evidence')
    .option('--framework <framework>', 'Filter by framework')
    .option('--control <controlId>', 'Filter by control ID')
    .option('--type <type>', 'Filter by type')
    .option('--status <status>', 'Filter by status')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
    const params = {};
    if (options.framework)
        params.framework = options.framework;
    if (options.control)
        params.controlId = options.control;
    if (options.type)
        params.type = options.type;
    if (options.status)
        params.status = options.status;
    const response = await (0, client_js_1.get)('/compliance/evidence', params);
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    if (response.data.length === 0) {
        console.log(chalk_1.default.yellow('No evidence found.'));
        return;
    }
    console.log(chalk_1.default.bold('\nCompliance Evidence\n'));
    const displayData = response.data.map((e) => ({
        id: e.id.substring(0, 8),
        control: e.controlId,
        framework: e.framework,
        type: e.type,
        source: e.source,
        status: e.status,
        collected: (0, utils_js_1.formatDate)(e.collectedAt),
    }));
    console.log((0, utils_js_1.formatOutput)(displayData, ['id', 'control', 'framework', 'type', 'status', 'collected']));
});
/**
 * Generate compliance report
 */
const report = new commander_1.Command('report')
    .description('Generate compliance report')
    .argument('<framework>', 'Framework (SOC2, ISO27001, GDPR, HIPAA)')
    .option('--format <format>', 'Report format (json, pdf, csv)', 'json')
    .option('--include-evidence', 'Include evidence in report')
    .option('-c, --categories <categories>', 'Comma-separated categories to include')
    .option('--start <date>', 'Start date for report period')
    .option('--end <date>', 'End date for report period')
    .option('-o, --output <path>', 'Output file path')
    .action(async (framework, options) => {
    const request = {
        format: options.format,
    };
    if (options.includeEvidence)
        request.includeEvidence = true;
    if (options.categories)
        request.categories = options.categories.split(',');
    if (options.start)
        request.startDate = options.start;
    if (options.end)
        request.endDate = options.end;
    console.log(chalk_1.default.blue(`Generating ${framework} compliance report...`));
    const response = await (0, client_js_1.post)(`/compliance/frameworks/${framework}/reports`, request);
    if (response.data.downloadUrl) {
        console.log(chalk_1.default.green(`\nReport generated successfully!`));
        console.log(`Download URL: ${response.data.downloadUrl}`);
    }
    else {
        console.log(chalk_1.default.yellow(`\nReport generation started.`));
        console.log(`Report ID: ${response.data.reportId}`);
        console.log(`Status: ${response.data.status}`);
        console.log(`\nRun 'summit compliance report-status ${response.data.reportId}' to check progress.`);
    }
});
exports.complianceCommands = {
    summary,
    controls,
    assess,
    evidence,
    report,
};
