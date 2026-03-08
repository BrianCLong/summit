"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverSkillpacks = exports.matchSkillpackTriggers = exports.listSkillpacks = exports.loadPolicyConfig = exports.loadMcpConfig = exports.loadSkillpackManifest = exports.parseSkillMarkdown = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const minimatch_1 = require("minimatch");
const FRONTMATTER_BOUNDARY = '---';
const parseSkillMarkdown = (content) => {
    const lines = content.split('\n');
    if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
        throw new Error('SKILL.md missing YAML frontmatter.');
    }
    const endIndex = lines.slice(1).findIndex((line) => line.trim() === FRONTMATTER_BOUNDARY);
    if (endIndex === -1) {
        throw new Error('SKILL.md frontmatter not terminated.');
    }
    const frontmatterLines = lines.slice(1, endIndex + 1);
    const frontmatter = js_yaml_1.default.load(frontmatterLines.join('\n'));
    if (!frontmatter?.name) {
        throw new Error('SKILL.md frontmatter must include name.');
    }
    const body = lines.slice(endIndex + 2).join('\n');
    return {
        name: frontmatter.name,
        description: frontmatter.description,
        triggers: frontmatter.triggers,
        shards: frontmatter.shards,
        body,
    };
};
exports.parseSkillMarkdown = parseSkillMarkdown;
const loadSkillpackManifest = async (skillDir) => {
    const skillPath = node_path_1.default.join(skillDir, 'SKILL.md');
    const content = await promises_1.default.readFile(skillPath, 'utf-8');
    return (0, exports.parseSkillMarkdown)(content);
};
exports.loadSkillpackManifest = loadSkillpackManifest;
const loadMcpConfig = async (skillDir) => {
    const mcpPath = node_path_1.default.join(skillDir, 'mcp.json');
    try {
        const content = await promises_1.default.readFile(mcpPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};
exports.loadMcpConfig = loadMcpConfig;
const loadPolicyConfig = async (skillDir) => {
    const policyPath = node_path_1.default.join(skillDir, 'policy.json');
    try {
        const content = await promises_1.default.readFile(policyPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};
exports.loadPolicyConfig = loadPolicyConfig;
const listSkillpacks = async (rootDir) => {
    const entries = await promises_1.default.readdir(rootDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
};
exports.listSkillpacks = listSkillpacks;
const matchSkillpackTriggers = (manifest, context) => {
    const triggers = manifest.triggers;
    if (!triggers) {
        return false;
    }
    const normalizedTask = context.taskType?.toLowerCase();
    const tasks = triggers.tasks?.map((task) => task.toLowerCase()) ?? [];
    const keywords = new Set((context.keywords ?? []).map((kw) => kw.toLowerCase()));
    const keywordTriggers = triggers.keywords?.map((kw) => kw.toLowerCase()) ?? [];
    const taskMatch = normalizedTask ? tasks.includes(normalizedTask) : false;
    const keywordMatch = keywordTriggers.some((trigger) => keywords.has(trigger));
    const pathPatterns = triggers.paths ?? [];
    const pathMatch = (context.repoPaths ?? []).some((repoPath) => pathPatterns.some((pattern) => (0, minimatch_1.minimatch)(repoPath, pattern, { matchBase: true })));
    return taskMatch || keywordMatch || pathMatch;
};
exports.matchSkillpackTriggers = matchSkillpackTriggers;
const discoverSkillpacks = async (options) => {
    const names = await (0, exports.listSkillpacks)(options.rootDir);
    const manifests = await Promise.all(names.map((name) => (0, exports.loadSkillpackManifest)(node_path_1.default.join(options.rootDir, name))));
    if (!options.triggerContext) {
        return manifests;
    }
    return manifests.filter((manifest) => (0, exports.matchSkillpackTriggers)(manifest, options.triggerContext));
};
exports.discoverSkillpacks = discoverSkillpacks;
