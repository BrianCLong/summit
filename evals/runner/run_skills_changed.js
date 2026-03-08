"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const report_js_1 = require("./report.js");
const filesystem_js_1 = require("./filesystem.js");
const repoRoot = node_path_1.default.resolve(node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url)), '../..');
const runGit = async (args) => new Promise((resolve, reject) => {
    const child = (0, node_child_process_1.spawn)('git', args, {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (data) => {
        output += data.toString();
    });
    child.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });
    child.on('close', (code) => {
        if (code !== 0) {
            reject(new Error(errorOutput || 'git command failed'));
        }
        else {
            resolve(output.trim());
        }
    });
});
const findChangedSkills = async () => {
    const baseRef = process.env.EVAL_SKILL_BASE_REF ?? 'origin/main';
    const mergeBase = await runGit(['merge-base', 'HEAD', baseRef]);
    const diff = await runGit(['diff', '--name-only', mergeBase]);
    const skills = new Set();
    diff
        .split(/\r?\n/)
        .filter((line) => line.startsWith('evals/skills/'))
        .forEach((line) => {
        const parts = line.split('/');
        if (parts.length >= 3) {
            skills.add(parts[2]);
        }
    });
    return Array.from(skills);
};
const runSkill = async (skill) => {
    await new Promise((resolve, reject) => {
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
};
const loadLatestSummary = async (skill) => {
    const summaryPath = node_path_1.default.join(repoRoot, 'evals', 'skills', skill, 'artifacts', 'latest.json');
    return (0, filesystem_js_1.readJson)(summaryPath);
};
const run = async () => {
    const skills = await findChangedSkills();
    if (skills.length === 0) {
        console.log('No changed skills detected.');
        return;
    }
    for (const skill of skills) {
        await runSkill(skill);
    }
    const summaries = await Promise.all(skills.map(loadLatestSummary));
    const reportDir = node_path_1.default.join(repoRoot, 'evals', 'runner', 'reports');
    await (0, filesystem_js_1.ensureDir)(reportDir);
    await (0, report_js_1.writeSuiteMarkdown)(node_path_1.default.join(reportDir, 'changed-skills.md'), summaries);
    await promises_1.default.writeFile(node_path_1.default.join(reportDir, 'changed-skills.json'), `${JSON.stringify(summaries, null, 2)}\n`, 'utf8');
};
run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
