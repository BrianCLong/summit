"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureReportDir = exports.writeSuiteMarkdown = exports.writeJUnitReport = exports.writeMarkdownReport = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const score_js_1 = require("./score.js");
const escapeXml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
const writeMarkdownReport = async (outputPath, summary) => {
    const checks = (0, score_js_1.summarizeChecks)(summary.deterministic, summary.rubric);
    const content = `# Eval Skill Report: ${summary.skill}\n\n` +
        `- Run ID: ${summary.run_id}\n` +
        `- Deterministic Score: ${summary.deterministic.score}\n` +
        `- Rubric Score: ${summary.rubric.score}\n` +
        `- Combined Score: ${summary.combined_score}\n` +
        `- Baseline Delta: ${(0, score_js_1.formatDelta)(summary.regression.delta)}\n` +
        `- Checks: ${checks.pass} passed / ${checks.fail} failed\n` +
        `- Overall Pass: ${summary.overall_pass}\n`;
    await promises_1.default.writeFile(outputPath, content, 'utf8');
};
exports.writeMarkdownReport = writeMarkdownReport;
const writeJUnitReport = async (outputPath, summary) => {
    const checks = [...summary.deterministic.checks, ...summary.rubric.checks];
    const failures = checks.filter((check) => !check.pass).length;
    const casesXml = checks
        .map((check) => {
        const caseName = escapeXml(check.id);
        if (check.pass) {
            return `  <testcase name="${caseName}" />`;
        }
        const message = escapeXml(check.notes ?? 'Check failed');
        return `  <testcase name="${caseName}">\n    <failure message="${message}" />\n  </testcase>`;
    })
        .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<testsuite name="${escapeXml(summary.skill)}" tests="${checks.length}" failures="${failures}">\n` +
        `${casesXml}\n` +
        `</testsuite>\n`;
    await promises_1.default.writeFile(outputPath, xml, 'utf8');
};
exports.writeJUnitReport = writeJUnitReport;
const writeSuiteMarkdown = async (outputPath, summaries) => {
    const lines = ['# Eval Skills Suite Summary', ''];
    summaries.forEach((summary) => {
        lines.push(`- ${summary.skill}: ${summary.combined_score} (pass=${summary.overall_pass}, delta=${(0, score_js_1.formatDelta)(summary.regression.delta)})`);
    });
    lines.push('');
    await promises_1.default.writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
};
exports.writeSuiteMarkdown = writeSuiteMarkdown;
const ensureReportDir = async (dir) => {
    await promises_1.default.mkdir(dir, { recursive: true });
    const keep = node_path_1.default.join(dir, '.keep');
    await promises_1.default.writeFile(keep, '');
};
exports.ensureReportDir = ensureReportDir;
