"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOpenClawCommands = registerOpenClawCommands;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const openclaw_js_1 = require("./openclaw.js");
const DEFAULT_INDEX_DIR = 'artifacts/openclaw-skills';
const DEFAULT_INDEX_FILE = 'skill-index.json';
const APPROVALS_ROOT = node_path_1.default.join('approvals', 'skills');
function registerOpenClawCommands(program) {
    const skills = program.command('skills').description('Manage OpenClaw skills');
    skills
        .command('ingest')
        .description('Ingest an OpenClaw skill repository and build deterministic indexes')
        .requiredOption('--repo <urlOrPath>', 'OpenClaw skill repo URL or local path')
        .option('--provider <provider>', 'Filter by provider directory')
        .option('--skill <skill>', 'Filter by skill directory')
        .option('--out <dir>', 'Output directory for artifacts', DEFAULT_INDEX_DIR)
        .action((options) => {
        const index = (0, openclaw_js_1.ingestOpenClawRepo)({
            repo: options.repo,
            provider: options.provider,
            skill: options.skill,
            outputDir: options.out,
        });
        console.log(JSON.stringify(index, null, 2));
    });
    skills
        .command('show')
        .description('Show a skill entry from the OpenClaw skill index')
        .argument('<slug>', 'Skill slug in provider/skill format')
        .option('--index <path>', 'Path to skill-index.json', node_path_1.default.join(DEFAULT_INDEX_DIR, DEFAULT_INDEX_FILE))
        .action((slug, options) => {
        const entry = findSkillEntry(options.index, slug);
        if (!entry) {
            console.error(`❌ Skill not found: ${slug}`);
            process.exitCode = 1;
            return;
        }
        console.log(JSON.stringify(entry, null, 2));
    });
    skills
        .command('run')
        .description('Validate approvals for OpenClaw skill execution (execution is deferred)')
        .argument('<slug>', 'Skill slug in provider/skill format')
        .option('--index <path>', 'Path to skill-index.json', node_path_1.default.join(DEFAULT_INDEX_DIR, DEFAULT_INDEX_FILE))
        .action((slug, options) => {
        const entry = findSkillEntry(options.index, slug);
        if (!entry) {
            console.error(`❌ Skill not found: ${slug}`);
            process.exitCode = 1;
            return;
        }
        const approvalPath = node_path_1.default.join(APPROVALS_ROOT, entry.provider, `${entry.skill}.json`);
        if (!node_fs_1.default.existsSync(approvalPath)) {
            console.error(`❌ Approval required at ${approvalPath}`);
            process.exitCode = 1;
            return;
        }
        console.error('❌ Execution deferred pending sandbox runtime. Approval recorded but execution remains disabled.');
        process.exitCode = 1;
    });
}
function findSkillEntry(indexPath, slug) {
    if (!node_fs_1.default.existsSync(indexPath)) {
        console.error(`❌ Skill index not found: ${indexPath}`);
        process.exitCode = 1;
        return undefined;
    }
    const index = (0, openclaw_js_1.loadSkillIndex)(indexPath);
    return index.skills.find((entry) => entry.slug === slug);
}
