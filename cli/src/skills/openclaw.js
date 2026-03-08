"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSkillMd = parseSkillMd;
exports.computeRisk = computeRisk;
exports.discoverOpenClawSkills = discoverOpenClawSkills;
exports.ingestOpenClawRepo = ingestOpenClawRepo;
exports.loadSkillIndex = loadSkillIndex;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const yaml_1 = require("yaml");
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
const RISK_PATTERNS = [
    /raw\s+transaction/i,
    /transaction\s+json/i,
    /calldata/i,
    /submit\s+raw/i,
];
function parseSkillMd(rawInput) {
    const raw = rawInput.replace(/^\uFEFF/, '');
    const match = raw.match(FRONTMATTER_RE);
    if (!match) {
        throw new Error('SKILL.md missing frontmatter block');
    }
    const rawFrontmatter = match[1];
    const bodyMarkdown = (match[2] ?? '').trim();
    const parsed = (0, yaml_1.parse)(rawFrontmatter) ?? {};
    const frontmatter = normalizeFrontmatter(parsed);
    return {
        frontmatter,
        bodyMarkdown,
        rawFrontmatter,
        raw,
    };
}
function computeRisk(doc) {
    const haystack = `${doc.frontmatter.description ?? ''}\n${doc.bodyMarkdown}`;
    const arbitraryTransactions = RISK_PATTERNS.some((rx) => rx.test(haystack));
    return { arbitraryTransactions };
}
function discoverOpenClawSkills(repoRoot, options = {}) {
    const providers = node_fs_1.default
        .readdirSync(repoRoot, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => !name.startsWith('.'))
        .filter((name) => (!options.provider ? true : name === options.provider));
    const discovered = [];
    for (const provider of providers) {
        const providerRoot = node_path_1.default.join(repoRoot, provider);
        const skills = node_fs_1.default
            .readdirSync(providerRoot, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .filter((name) => (!options.skill ? true : name === options.skill));
        for (const skill of skills) {
            const skillRoot = node_path_1.default.join(providerRoot, skill);
            const skillMd = node_path_1.default.join(skillRoot, 'SKILL.md');
            if (!node_fs_1.default.existsSync(skillMd)) {
                continue;
            }
            discovered.push({ provider, skill, root: skillRoot });
        }
    }
    return discovered.sort((a, b) => `${a.provider}/${a.skill}`.localeCompare(`${b.provider}/${b.skill}`));
}
function ingestOpenClawRepo(options) {
    const { repo, provider, skill, outputDir } = options;
    const { repoRoot, commit } = resolveRepoRoot(repo);
    const skills = discoverOpenClawSkills(repoRoot, { provider, skill });
    if (skills.length === 0) {
        throw new Error('No OpenClaw skills found for the provided filters.');
    }
    const entries = skills.map((entry) => {
        const skillMdPath = node_path_1.default.join(entry.root, 'SKILL.md');
        const rawSkillMd = node_fs_1.default.readFileSync(skillMdPath, 'utf-8');
        const doc = parseSkillMd(rawSkillMd);
        const sha256 = hashSha256(rawSkillMd);
        const evidenceId = buildEvidenceId(entry.provider, entry.skill, sha256);
        const risk = computeRisk(doc);
        return {
            provider: entry.provider,
            skill: entry.skill,
            slug: `${entry.provider}/${entry.skill}`,
            name: doc.frontmatter.name,
            description: doc.frontmatter.description,
            metadata: doc.frontmatter.metadata,
            sha256,
            evidenceId,
            risk,
            assets: collectAssets(entry.root),
        };
    });
    const index = {
        schemaVersion: 1,
        repo,
        commit,
        skills: entries,
    };
    const evidence = {
        schemaVersion: 1,
        repo,
        commit,
        skills: entries.map((entry) => ({
            provider: entry.provider,
            skill: entry.skill,
            evidenceId: entry.evidenceId,
            sha256: entry.sha256,
        })),
    };
    node_fs_1.default.mkdirSync(outputDir, { recursive: true });
    node_fs_1.default.writeFileSync(node_path_1.default.join(outputDir, 'skill-index.json'), JSON.stringify(index, null, 2));
    node_fs_1.default.writeFileSync(node_path_1.default.join(outputDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
    return index;
}
function loadSkillIndex(indexPath) {
    const raw = node_fs_1.default.readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
}
function normalizeFrontmatter(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('frontmatter must be a YAML mapping');
    }
    const data = parsed;
    const name = toStringValue(data.name);
    if (!name) {
        throw new Error('frontmatter missing required key: name');
    }
    const description = toStringValue(data.description) || undefined;
    const metadata = normalizeMetadata(data.metadata);
    return {
        name,
        description,
        metadata,
    };
}
function normalizeMetadata(value) {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const metadata = value;
    const clawdbot = normalizeClawdbot(metadata.clawdbot);
    if (!clawdbot) {
        return undefined;
    }
    return { clawdbot };
}
function normalizeClawdbot(value) {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const clawdbot = value;
    const requires = normalizeRequires(clawdbot.requires);
    return {
        emoji: toStringValue(clawdbot.emoji) || undefined,
        homepage: toStringValue(clawdbot.homepage) || undefined,
        requires,
    };
}
function normalizeRequires(value) {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const requires = value;
    return {
        bins: toStringArray(requires.bins),
        env: toStringArray(requires.env),
        config: toStringArray(requires.config),
    };
}
function toStringValue(value) {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return '';
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const result = value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);
    return result.length > 0 ? result : undefined;
}
function collectAssets(skillRoot) {
    const scripts = collectFiles(node_path_1.default.join(skillRoot, 'scripts'));
    const references = collectFiles(node_path_1.default.join(skillRoot, 'references'));
    return { scripts, references };
}
function collectFiles(root) {
    if (!node_fs_1.default.existsSync(root) || !node_fs_1.default.statSync(root).isDirectory()) {
        return [];
    }
    const collected = [];
    for (const entry of node_fs_1.default.readdirSync(root, { withFileTypes: true })) {
        if (entry.isFile()) {
            collected.push(node_path_1.default.join(node_path_1.default.basename(root), entry.name));
        }
    }
    return collected.sort();
}
function resolveRepoRoot(repo) {
    if (repo.startsWith('file://')) {
        const repoRoot = (0, node_url_1.fileURLToPath)(repo);
        return { repoRoot, commit: resolveGitCommit(repoRoot) };
    }
    if (node_fs_1.default.existsSync(repo)) {
        return { repoRoot: repo, commit: resolveGitCommit(repo) };
    }
    const tmpRoot = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'openclaw-'));
    const repoRoot = node_path_1.default.join(tmpRoot, 'repo');
    const result = (0, node_child_process_1.spawnSync)('git', ['clone', '--depth', '1', repo, repoRoot], {
        stdio: 'ignore',
    });
    if (result.status !== 0) {
        throw new Error('Failed to clone OpenClaw skill repo.');
    }
    return { repoRoot, commit: resolveGitCommit(repoRoot) };
}
function resolveGitCommit(repoRoot) {
    const result = (0, node_child_process_1.spawnSync)('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
        encoding: 'utf-8',
    });
    if (result.status !== 0 || !result.stdout) {
        return 'unknown';
    }
    return String(result.stdout).trim() || 'unknown';
}
function hashSha256(input) {
    return node_crypto_1.default.createHash('sha256').update(input).digest('hex');
}
function buildEvidenceId(provider, skill, sha256) {
    return `EVID:OPENCLAW:${provider}:${skill}:${sha256.slice(0, 8)}`;
}
