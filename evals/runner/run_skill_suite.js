"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const filesystem_js_1 = require("./filesystem.js");
const report_js_1 = require("./report.js");
const repoRoot = node_path_1.default.resolve(node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url)), '../..');
const listSkills = async () => {
    const skillsDir = node_path_1.default.join(repoRoot, 'evals', 'skills');
    const entries = await promises_1.default.readdir(skillsDir, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => !name.startsWith('.'));
};
const runSkill = async (skill) => new Promise((resolve, reject) => {
    const child = (0, node_child_process_1.spawn)('npx', ['tsx', 'evals/runner/run_skill_eval.ts', '--skill', skill], {
        cwd: repoRoot,
        stdio: 'inherit',
    });
    child.on('close', (code) => {
        if (code === 0) {
            resolve();
        }
        else {
            reject(new Error(`Skill ${skill} failed with code ${code}`));
        }
    });
});
const loadLatestSummary = async (skill) => {
    const summaryPath = node_path_1.default.join(repoRoot, 'evals', 'skills', skill, 'artifacts', 'latest.json');
    return (0, filesystem_js_1.readJson)(summaryPath);
};
const run = async () => {
    const skills = await listSkills();
    for (const skill of skills) {
        await runSkill(skill);
    }
    const summaries = await Promise.all(skills.map(loadLatestSummary));
    const reportDir = node_path_1.default.join(repoRoot, 'evals', 'runner', 'reports');
    await (0, filesystem_js_1.ensureDir)(reportDir);
    await (0, report_js_1.writeSuiteMarkdown)(node_path_1.default.join(reportDir, 'suite.md'), summaries);
    await promises_1.default.writeFile(node_path_1.default.join(reportDir, 'suite.json'), `${JSON.stringify(summaries, null, 2)}\n`, 'utf8');
};
run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
