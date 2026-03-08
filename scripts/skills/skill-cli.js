"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const node_os_1 = __importDefault(require("node:os"));
const node_child_process_1 = require("node:child_process");
const js_yaml_1 = __importDefault(require("js-yaml"));
const evidence_js_1 = require("./evidence.js");
const repoRoot = process.cwd();
const registryDir = node_path_1.default.join(repoRoot, 'skills', 'registry');
const externalDir = node_path_1.default.join(repoRoot, 'skills', 'external');
const overlayDir = node_path_1.default.join(repoRoot, 'skills', 'overlays');
const lockPath = node_path_1.default.join(registryDir, 'skills.lock.json');
const manifestPath = node_path_1.default.join(registryDir, 'skills.manifest.json');
const evidenceDir = node_path_1.default.join(repoRoot, 'evidence', 'skills');
const readJson = async (filePath) => {
    const raw = await node_fs_1.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
};
const writeJson = async (filePath, data) => {
    await node_fs_1.promises.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
const ensureDirs = async () => {
    await node_fs_1.promises.mkdir(registryDir, { recursive: true });
    await node_fs_1.promises.mkdir(externalDir, { recursive: true });
    await node_fs_1.promises.mkdir(overlayDir, { recursive: true });
    await node_fs_1.promises.mkdir(evidenceDir, { recursive: true });
};
const runCommand = async (command, args, cwd, env) => {
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(command, args, {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: env ?? process.env,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.on('error', (error) => {
            reject(error);
        });
        child.on('close', (code) => {
            resolve({ stdout, stderr, code: code ?? 0 });
        });
    });
};
const listFiles = async (dir) => {
    const entries = await node_fs_1.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = node_path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '.git') {
                return [];
            }
            return listFiles(fullPath);
        }
        return [fullPath];
    }));
    return files.flat();
};
const hashDirectory = async (dir) => {
    const files = await listFiles(dir);
    const relativeFiles = files
        .map((file) => node_path_1.default.relative(dir, file))
        .sort((a, b) => a.localeCompare(b));
    const hash = (0, node_crypto_1.createHash)('sha256');
    for (const relativeFile of relativeFiles) {
        const filePath = node_path_1.default.join(dir, relativeFile);
        const contents = await node_fs_1.promises.readFile(filePath);
        hash.update(relativeFile);
        hash.update('\0');
        hash.update(contents);
        hash.update('\0');
    }
    return hash.digest('hex');
};
const copyDirectory = async (source, destination) => {
    await node_fs_1.promises.mkdir(destination, { recursive: true });
    const entries = await node_fs_1.promises.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === '.git') {
            continue;
        }
        const srcPath = node_path_1.default.join(source, entry.name);
        const destPath = node_path_1.default.join(destination, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        }
        else {
            await node_fs_1.promises.copyFile(srcPath, destPath);
        }
    }
};
const sanitizeEnv = () => {
    const sanitized = {};
    const sensitivePattern = /(token|secret|password|key|credential)/i;
    for (const [key, value] of Object.entries(process.env)) {
        if (sensitivePattern.test(key)) {
            continue;
        }
        sanitized[key] = value;
    }
    return sanitized;
};
const loadRegistry = async () => {
    return readJson(lockPath);
};
const loadManifest = async () => {
    return readJson(manifestPath);
};
const writeRegistry = async (registry) => {
    const sorted = {
        ...registry,
        skills: [...registry.skills].sort((a, b) => a.name.localeCompare(b.name)),
    };
    await writeJson(lockPath, sorted);
};
const writeManifest = async (manifest) => {
    const sorted = {
        ...manifest,
        skills: [...manifest.skills].sort((a, b) => a.name.localeCompare(b.name)),
    };
    await writeJson(manifestPath, sorted);
};
const parseFrontmatter = async (skillDir) => {
    const skillFile = node_path_1.default.join(skillDir, 'SKILL.md');
    try {
        const content = await node_fs_1.promises.readFile(skillFile, 'utf8');
        if (!content.startsWith('---')) {
            return {};
        }
        const [, frontmatter] = content.split('---');
        if (!frontmatter) {
            return {};
        }
        const parsed = js_yaml_1.default.load(frontmatter.trim());
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
        }
    }
    catch (error) {
        return {};
    }
    return {};
};
const detectFindings = async (skillDir) => {
    const files = await listFiles(skillDir);
    const findings = [];
    const rules = [
        {
            rule: 'dangerous-rm',
            regex: /rm\s+-rf|mkfs|dd\s+if=\/dev\/zero/,
            severity: 'high',
            message: 'Destructive filesystem command detected',
        },
        {
            rule: 'curl-pipe',
            regex: /curl\s+[^\n]+\|\s*(sh|bash)/,
            severity: 'high',
            message: 'Curl pipe to shell detected',
        },
        {
            rule: 'network-access',
            regex: /\b(curl|wget|Invoke-WebRequest)\b|https?:\/\//,
            severity: 'medium',
            message: 'Network access detected',
        },
        {
            rule: 'credential-access',
            regex: /AWS_ACCESS_KEY_ID|KUBECONFIG|GOOGLE_APPLICATION_CREDENTIALS|AZURE_CLIENT_SECRET/,
            severity: 'high',
            message: 'Credential access detected',
        },
        {
            rule: 'shell-exec',
            regex: /\b(bash|sh|pwsh|powershell)\b\s+-c/,
            severity: 'medium',
            message: 'Shell execution detected',
        },
    ];
    for (const file of files) {
        const stats = await node_fs_1.promises.stat(file);
        if (stats.size > 1024 * 1024) {
            continue;
        }
        const content = await node_fs_1.promises.readFile(file, 'utf8');
        for (const rule of rules) {
            if (rule.regex.test(content)) {
                findings.push({
                    rule: rule.rule,
                    message: rule.message,
                    severity: rule.severity,
                    file: node_path_1.default.relative(skillDir, file),
                });
            }
        }
    }
    return findings;
};
const collectRequestedPermissions = (findings) => {
    return {
        network: findings.some((finding) => finding.rule === 'network-access'),
        shell: findings.some((finding) => finding.rule === 'shell-exec'),
        fs_write: findings.some((finding) => finding.rule === 'dangerous-rm'),
        credentials: findings.some((finding) => finding.rule === 'credential-access'),
    };
};
const evaluatePolicy = async (input, overlayPolicyPath) => {
    const tmpDir = await node_fs_1.promises.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'summit-skill-'));
    const inputPath = node_path_1.default.join(tmpDir, 'input.json');
    await node_fs_1.promises.writeFile(inputPath, `${JSON.stringify(input)}\n`, 'utf8');
    const args = ['eval', '-f', 'json', '-d', node_path_1.default.join(repoRoot, 'policy', 'skills')];
    if (overlayPolicyPath) {
        args.push('-d', overlayPolicyPath);
    }
    args.push('-i', inputPath, 'data.summit.skills');
    try {
        const result = await runCommand('opa', args, repoRoot);
        if (result.code !== 0) {
            return { allow: false, denies: [result.stderr.trim() || 'OPA evaluation failed'] };
        }
        const parsed = JSON.parse(result.stdout);
        const value = parsed.result?.[0]?.expressions?.[0]?.value;
        const allow = Boolean(value?.allow);
        const denies = Array.isArray(value?.deny) ? value?.deny : [];
        return { allow, denies };
    }
    catch (error) {
        return { allow: false, denies: ['OPA not available or evaluation failed'] };
    }
};
const gitDiffSummary = async () => {
    const nameOutput = await runCommand('git', ['diff', '--name-only'], repoRoot);
    const files = nameOutput.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    const summaryOutput = await runCommand('git', ['diff', '--stat'], repoRoot);
    return { files, summary: summaryOutput.stdout.trim() };
};
const checksumsForFiles = async (files) => {
    const checksums = {};
    for (const file of files) {
        const absPath = node_path_1.default.join(repoRoot, file);
        try {
            const content = await node_fs_1.promises.readFile(absPath);
            const hash = (0, node_crypto_1.createHash)('sha256').update(content).digest('hex');
            checksums[file] = hash;
        }
        catch (error) {
            continue;
        }
    }
    return checksums;
};
const resolveSkillPath = (skillName) => node_path_1.default.join(externalDir, skillName);
const resolveOverlayPolicyPath = async (skillName) => {
    const overlayPath = node_path_1.default.join(overlayDir, skillName, 'SUMMIT.policy.rego');
    try {
        await node_fs_1.promises.access(overlayPath);
        return overlayPath;
    }
    catch (error) {
        return undefined;
    }
};
const parseSkillNameFromUrl = (sourceUrl) => {
    const trimmed = sourceUrl.replace(/\/$/, '');
    const base = trimmed.split('/').pop() ?? 'skill';
    return base.replace(/\.git$/, '');
};
const ensureSkillAvailable = async (skillName) => {
    const skillPath = resolveSkillPath(skillName);
    try {
        await node_fs_1.promises.access(skillPath);
    }
    catch (error) {
        throw new Error(`Skill ${skillName} not found in ${skillPath}`);
    }
};
const updateRegistryEntry = (registry, entry) => {
    const existing = registry.skills.filter((skill) => skill.name !== entry.name);
    return {
        ...registry,
        generated_at: new Date().toISOString(),
        skills: [...existing, entry],
    };
};
const updateManifestEntry = (manifest, entry) => {
    const existing = manifest.skills.filter((skill) => skill.name !== entry.name);
    return {
        ...manifest,
        generated_at: new Date().toISOString(),
        skills: [...existing, entry],
    };
};
const command = new commander_1.Command();
command.name('skill').description('Summit Skills CLI');
command
    .command('list')
    .description('List registered skills')
    .action(async () => {
    const manifest = await loadManifest();
    manifest.skills.forEach((skill) => {
        process.stdout.write(`${skill.name}\t${skill.status}\t${skill.source}\n`);
    });
});
command
    .command('add')
    .description('Add a skill from a source repository')
    .argument('<source_url>', 'Source repository URL')
    .requiredOption('--commit <sha>', 'Commit SHA to pin')
    .option('--name <name>', 'Override skill name')
    .action(async (sourceUrl, options) => {
    await ensureDirs();
    const name = options.name ?? parseSkillNameFromUrl(sourceUrl);
    const destination = resolveSkillPath(name);
    try {
        await node_fs_1.promises.access(destination);
        throw new Error(`Skill ${name} already exists at ${destination}`);
    }
    catch (error) {
        // continue
    }
    const tmpDir = await node_fs_1.promises.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'summit-skill-'));
    const toolCalls = [];
    const gitCommands = [
        { args: ['init', tmpDir] },
        { args: ['-C', tmpDir, 'remote', 'add', 'origin', sourceUrl] },
        { args: ['-C', tmpDir, 'fetch', '--depth', '1', 'origin', options.commit] },
        { args: ['-C', tmpDir, 'checkout', 'FETCH_HEAD'] },
    ];
    for (const gitCommand of gitCommands) {
        const result = await runCommand('git', gitCommand.args, repoRoot);
        toolCalls.push({
            command: 'git',
            args: gitCommand.args,
            stdout: result.stdout.trim(),
            stderr: result.stderr.trim(),
            code: result.code,
        });
        if (result.code !== 0) {
            throw new Error(`Git command failed: git ${gitCommand.args.join(' ')}`);
        }
    }
    await copyDirectory(tmpDir, destination);
    const sha256 = await hashDirectory(destination);
    const frontmatter = await parseFrontmatter(destination);
    const displayName = frontmatter.name ??
        frontmatter.title ??
        name;
    const registry = await loadRegistry();
    const manifest = await loadManifest();
    const updatedRegistry = updateRegistryEntry(registry, {
        name,
        source: sourceUrl,
        commit: options.commit,
        sha256,
        path: node_path_1.default.relative(repoRoot, destination),
    });
    const updatedManifest = updateManifestEntry(manifest, {
        name,
        display_name: displayName,
        source: sourceUrl,
        commit: options.commit,
        sha256,
        overlay: node_path_1.default.relative(repoRoot, node_path_1.default.join(overlayDir, name)),
        status: 'active',
        governed_exception: false,
        domains: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    });
    await writeRegistry(updatedRegistry);
    await writeManifest(updatedManifest);
    const diffSummary = await gitDiffSummary();
    const evidenceBundle = (0, evidence_js_1.buildEvidenceBundle)({
        skill: name,
        inputs: { sourceUrl, commit: options.commit },
        tool_calls: toolCalls,
        outputs: { destination, sha256 },
        diffs: diffSummary,
        checksums: await checksumsForFiles(diffSummary.files),
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await (0, evidence_js_1.writeEvidenceBundle)(node_path_1.default.join(evidenceDir, timestamp), evidenceBundle, 'skill-add.json');
    process.stdout.write(`Added skill ${name}\n`);
});
command
    .command('vet')
    .description('Vet a skill for policy compliance')
    .argument('[skill]', 'Skill name (omit with --all)')
    .option('--all', 'Vet all registered skills')
    .option('--advisory', 'Exit 0 even if policy denies')
    .action(async (skill, options) => {
    const registry = await loadRegistry();
    const targets = options.all
        ? registry.skills.map((entry) => entry.name)
        : [skill].filter(Boolean);
    if (targets.length === 0) {
        throw new Error('No skills specified. Use --all or provide a skill name.');
    }
    const failures = [];
    for (const target of targets) {
        await ensureSkillAvailable(target);
        const skillPath = resolveSkillPath(target);
        const findings = await detectFindings(skillPath);
        const requested = collectRequestedPermissions(findings);
        const policyInput = {
            skill: target,
            findings,
            requested,
        };
        const overlayPolicyPath = await resolveOverlayPolicyPath(target);
        const policy = await evaluatePolicy(policyInput, overlayPolicyPath);
        const diffSummary = await gitDiffSummary();
        const evidenceBundle = (0, evidence_js_1.buildEvidenceBundle)({
            skill: target,
            inputs: policyInput,
            outputs: { findings },
            policy,
            diffs: diffSummary,
            checksums: await checksumsForFiles(diffSummary.files),
        });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await (0, evidence_js_1.writeEvidenceBundle)(node_path_1.default.join(evidenceDir, timestamp), evidenceBundle, 'skill-vet.json');
        if (!policy.allow) {
            failures.push(`${target}: ${policy.denies.join('; ') || 'Policy denied'}`);
        }
    }
    if (failures.length > 0 && !options.advisory) {
        throw new Error(`Policy denial:\n${failures.join('\n')}`);
    }
});
command
    .command('run')
    .description('Run a skill in a constrained environment')
    .argument('<skill>', 'Skill name')
    .option('--dry-run', 'Emit evidence without executing')
    .option('--apply', 'Execute skill with policy gating')
    .action(async (skill, options) => {
    if (!options.dryRun && !options.apply) {
        throw new Error('Choose --dry-run or --apply');
    }
    await ensureSkillAvailable(skill);
    const runConfigPath = node_path_1.default.join(overlayDir, skill, 'SUMMIT.run.json');
    let runConfig = null;
    try {
        const configContent = await node_fs_1.promises.readFile(runConfigPath, 'utf8');
        runConfig = JSON.parse(configContent);
    }
    catch (error) {
        if (options.apply) {
            throw new Error(`Missing run configuration at ${runConfigPath}`);
        }
    }
    const requested = runConfig?.permissions ?? {
        network: false,
        shell: false,
        fs_write: false,
        credentials: false,
    };
    const policyInput = {
        skill,
        findings: [],
        requested,
    };
    const policy = await evaluatePolicy(policyInput, await resolveOverlayPolicyPath(skill));
    if (!policy.allow && options.apply) {
        throw new Error(`Policy denied run: ${policy.denies.join('; ')}`);
    }
    const toolCalls = [];
    const outputs = {};
    if (options.apply && runConfig) {
        const result = await runCommand(runConfig.command, runConfig.args ?? [], resolveSkillPath(skill), sanitizeEnv());
        toolCalls.push({
            command: runConfig.command,
            args: runConfig.args ?? [],
            stdout: result.stdout.trim(),
            stderr: result.stderr.trim(),
            code: result.code,
        });
        outputs.exit_code = result.code;
        outputs.stdout = result.stdout.trim();
        outputs.stderr = result.stderr.trim();
        if (result.code !== 0) {
            throw new Error(`Skill run failed with exit code ${result.code}`);
        }
    }
    const diffSummary = await gitDiffSummary();
    const evidenceBundle = (0, evidence_js_1.buildEvidenceBundle)({
        skill,
        inputs: { run: runConfig ?? { dryRun: true }, policyInput },
        tool_calls: toolCalls,
        outputs,
        policy,
        diffs: diffSummary,
        checksums: await checksumsForFiles(diffSummary.files),
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await (0, evidence_js_1.writeEvidenceBundle)(node_path_1.default.join(evidenceDir, timestamp), evidenceBundle, 'skill-run.json');
});
command.parseAsync(process.argv);
