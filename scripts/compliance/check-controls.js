"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const DEFAULT_MATRIX_PATH = 'compliance/control-matrix.yml';
function parseArgs() {
    const args = process.argv.slice(2);
    const today = new Date();
    const dateStamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    let outputPath = node_path_1.default.join('artifacts', `compliance-report-${dateStamp}.json`);
    let markdownPath;
    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--output' && args[i + 1]) {
            outputPath = args[i + 1];
            i += 1;
        }
        else if (args[i] === '--markdown' && args[i + 1]) {
            markdownPath = args[i + 1];
            i += 1;
        }
    }
    return { outputPath, markdownPath };
}
function loadControlMatrix(matrixPath) {
    if (!(0, node_fs_1.existsSync)(matrixPath)) {
        throw new Error(`Control matrix not found at ${matrixPath}`);
    }
    const raw = (0, node_fs_1.readFileSync)(matrixPath, 'utf-8');
    const parsed = js_yaml_1.default.load(raw);
    if (!parsed?.controls || !Array.isArray(parsed.controls)) {
        throw new Error('Invalid control matrix format: expected "controls" array');
    }
    return parsed.controls;
}
function ensureDir(targetPath) {
    (0, node_fs_1.mkdirSync)(targetPath, { recursive: true });
}
function sanitizeId(id) {
    return id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
function runEvidenceScript(controlId, scriptPath, logDir) {
    if (!(0, node_fs_1.existsSync)(scriptPath)) {
        return { script: scriptPath, status: 'missing', message: 'Script not found' };
    }
    if (scriptPath.startsWith('.github/workflows') || scriptPath.endsWith('.yml') || scriptPath.endsWith('.yaml')) {
        return { script: scriptPath, status: 'skipped', message: 'Workflow reference captured (not executable in runner)' };
    }
    const safeId = sanitizeId(controlId);
    const scriptName = node_path_1.default.basename(scriptPath).replace(/\.[^.]+$/, '');
    const logPath = node_path_1.default.join(logDir, `${safeId}-${scriptName}.log`);
    const execution = (0, node_child_process_1.spawnSync)(scriptPath, {
        shell: true,
        encoding: 'utf-8',
    });
    ensureDir(node_path_1.default.dirname(logPath));
    const combinedOutput = `${execution.stdout ?? ''}${execution.stderr ?? ''}`;
    (0, node_fs_1.writeFileSync)(logPath, combinedOutput, 'utf-8');
    const status = execution.status === 0 ? 'passed' : 'failed';
    return {
        script: scriptPath,
        status,
        outputPath: logPath,
        message: execution.status === 0 ? 'Completed successfully' : execution.stderr || execution.stdout,
    };
}
function evaluateControl(control, logDir) {
    const evidenceScripts = control.evidence_scripts ?? [];
    if (evidenceScripts.length === 0) {
        return { id: control.id, name: control.name, category: control.category, status: 'UNKNOWN', evidence: [] };
    }
    const evidenceResults = evidenceScripts.map((script) => runEvidenceScript(control.id, script, logDir));
    const hasFailure = evidenceResults.some((result) => result.status === 'failed' || result.status === 'missing');
    const hasPass = evidenceResults.some((result) => result.status === 'passed');
    const allSkipped = evidenceResults.every((result) => result.status === 'skipped');
    let status = 'UNKNOWN';
    if (hasFailure) {
        status = 'FAIL';
    }
    else if (hasPass) {
        status = 'PASS';
    }
    else if (allSkipped) {
        status = 'UNKNOWN';
    }
    return {
        id: control.id,
        name: control.name,
        category: control.category,
        status,
        evidence: evidenceResults,
    };
}
function writeMarkdown(report, markdownPath) {
    const lines = ['# Compliance Check Summary', '', `Generated: ${report.generatedAt}`, '', '| Control | Status | Evidence |', '| --- | --- | --- |'];
    report.controls.forEach((control) => {
        const evidenceList = control.evidence
            .map((item) => `${item.script} (${item.status}${item.outputPath ? ` → ${item.outputPath}` : ''})`)
            .join('<br>');
        lines.push(`| ${control.id} — ${control.name} | ${control.status} | ${evidenceList || 'None'} |`);
    });
    ensureDir(node_path_1.default.dirname(markdownPath));
    (0, node_fs_1.writeFileSync)(markdownPath, lines.join('\n'), 'utf-8');
}
function generateReport(matrixPath, outputPath, markdownPath) {
    const controls = loadControlMatrix(matrixPath);
    const logDir = node_path_1.default.join(node_path_1.default.dirname(outputPath), 'compliance-logs');
    ensureDir(logDir);
    ensureDir(node_path_1.default.dirname(outputPath));
    const results = controls.map((control) => evaluateControl(control, logDir));
    const report = {
        generatedAt: new Date().toISOString(),
        reportPath: node_path_1.default.resolve(outputPath),
        controls: results,
    };
    (0, node_fs_1.writeFileSync)(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    if (markdownPath) {
        writeMarkdown(report, markdownPath);
    }
    console.log(`Compliance report written to ${outputPath}`);
    if (markdownPath) {
        console.log(`Markdown summary written to ${markdownPath}`);
    }
}
function main() {
    const { outputPath, markdownPath } = parseArgs();
    generateReport(DEFAULT_MATRIX_PATH, outputPath, markdownPath);
}
try {
    main();
}
catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Compliance check failed: ${message}`);
    process.exitCode = 1;
}
