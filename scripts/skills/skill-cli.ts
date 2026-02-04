import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { spawn } from 'node:child_process';
import yaml from 'js-yaml';
import { buildEvidenceBundle, writeEvidenceBundle } from './evidence.js';

type SkillLockEntry = {
  name: string;
  source: string;
  commit: string;
  sha256: string;
  path: string;
  governed_exception?: boolean;
  exception_reason?: string;
};

type SkillManifestEntry = {
  name: string;
  display_name: string;
  source: string;
  commit: string;
  sha256: string;
  overlay: string;
  status: string;
  governed_exception?: boolean;
  domains: string[];
};

type SkillRegistry = {
  version: number;
  generated_at: string;
  skills: SkillLockEntry[];
};

type SkillManifest = {
  version: number;
  generated_at: string;
  skills: SkillManifestEntry[];
};

type VetFinding = {
  rule: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  file: string;
};

type RequestedPermissions = {
  network: boolean;
  shell: boolean;
  fs_write: boolean;
  credentials: boolean;
};

type PolicyResult = {
  allow: boolean;
  denies: string[];
};

const repoRoot = process.cwd();
const registryDir = path.join(repoRoot, 'skills', 'registry');
const externalDir = path.join(repoRoot, 'skills', 'external');
const overlayDir = path.join(repoRoot, 'skills', 'overlays');

const lockPath = path.join(registryDir, 'skills.lock.json');
const manifestPath = path.join(registryDir, 'skills.manifest.json');

const evidenceDir = path.join(repoRoot, 'evidence', 'skills');

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

const writeJson = async (filePath: string, data: unknown): Promise<void> => {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const ensureDirs = async (): Promise<void> => {
  await fs.mkdir(registryDir, { recursive: true });
  await fs.mkdir(externalDir, { recursive: true });
  await fs.mkdir(overlayDir, { recursive: true });
  await fs.mkdir(evidenceDir, { recursive: true });
};

const runCommand = async (
  command: string,
  args: string[],
  cwd?: string,
  env?: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string; code: number }> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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

const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git') {
          return [];
        }
        return listFiles(fullPath);
      }
      return [fullPath];
    }),
  );
  return files.flat();
};

const hashDirectory = async (dir: string): Promise<string> => {
  const files = await listFiles(dir);
  const relativeFiles = files
    .map((file) => path.relative(dir, file))
    .sort((a, b) => a.localeCompare(b));
  const hash = createHash('sha256');
  for (const relativeFile of relativeFiles) {
    const filePath = path.join(dir, relativeFile);
    const contents = await fs.readFile(filePath);
    hash.update(relativeFile);
    hash.update('\0');
    hash.update(contents);
    hash.update('\0');
  }
  return hash.digest('hex');
};

const copyDirectory = async (source: string, destination: string): Promise<void> => {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git') {
      continue;
    }
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
};

const sanitizeEnv = (): NodeJS.ProcessEnv => {
  const sanitized: NodeJS.ProcessEnv = {};
  const sensitivePattern = /(token|secret|password|key|credential)/i;
  for (const [key, value] of Object.entries(process.env)) {
    if (sensitivePattern.test(key)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
};

const loadRegistry = async (): Promise<SkillRegistry> => {
  return readJson<SkillRegistry>(lockPath);
};

const loadManifest = async (): Promise<SkillManifest> => {
  return readJson<SkillManifest>(manifestPath);
};

const writeRegistry = async (registry: SkillRegistry): Promise<void> => {
  const sorted = {
    ...registry,
    skills: [...registry.skills].sort((a, b) => a.name.localeCompare(b.name)),
  };
  await writeJson(lockPath, sorted);
};

const writeManifest = async (manifest: SkillManifest): Promise<void> => {
  const sorted = {
    ...manifest,
    skills: [...manifest.skills].sort((a, b) => a.name.localeCompare(b.name)),
  };
  await writeJson(manifestPath, sorted);
};

const parseFrontmatter = async (skillDir: string): Promise<Record<string, unknown>> => {
  const skillFile = path.join(skillDir, 'SKILL.md');
  try {
    const content = await fs.readFile(skillFile, 'utf8');
    if (!content.startsWith('---')) {
      return {};
    }
    const [, frontmatter] = content.split('---');
    if (!frontmatter) {
      return {};
    }
    const parsed = yaml.load(frontmatter.trim());
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    return {};
  }
  return {};
};

const detectFindings = async (skillDir: string): Promise<VetFinding[]> => {
  const files = await listFiles(skillDir);
  const findings: VetFinding[] = [];
  const rules = [
    {
      rule: 'dangerous-rm',
      regex: /rm\s+-rf|mkfs|dd\s+if=\/dev\/zero/,
      severity: 'high' as const,
      message: 'Destructive filesystem command detected',
    },
    {
      rule: 'curl-pipe',
      regex: /curl\s+[^\n]+\|\s*(sh|bash)/,
      severity: 'high' as const,
      message: 'Curl pipe to shell detected',
    },
    {
      rule: 'network-access',
      regex: /\b(curl|wget|Invoke-WebRequest)\b|https?:\/\//,
      severity: 'medium' as const,
      message: 'Network access detected',
    },
    {
      rule: 'credential-access',
      regex: /AWS_ACCESS_KEY_ID|KUBECONFIG|GOOGLE_APPLICATION_CREDENTIALS|AZURE_CLIENT_SECRET/,
      severity: 'high' as const,
      message: 'Credential access detected',
    },
    {
      rule: 'shell-exec',
      regex: /\b(bash|sh|pwsh|powershell)\b\s+-c/,
      severity: 'medium' as const,
      message: 'Shell execution detected',
    },
  ];

  for (const file of files) {
    const stats = await fs.stat(file);
    if (stats.size > 1024 * 1024) {
      continue;
    }
    const content = await fs.readFile(file, 'utf8');
    for (const rule of rules) {
      if (rule.regex.test(content)) {
        findings.push({
          rule: rule.rule,
          message: rule.message,
          severity: rule.severity,
          file: path.relative(skillDir, file),
        });
      }
    }
  }

  return findings;
};

const collectRequestedPermissions = (findings: VetFinding[]): RequestedPermissions => {
  return {
    network: findings.some((finding) => finding.rule === 'network-access'),
    shell: findings.some((finding) => finding.rule === 'shell-exec'),
    fs_write: findings.some((finding) => finding.rule === 'dangerous-rm'),
    credentials: findings.some((finding) => finding.rule === 'credential-access'),
  };
};

const evaluatePolicy = async (
  input: Record<string, unknown>,
  overlayPolicyPath?: string,
): Promise<PolicyResult> => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-skill-'));
  const inputPath = path.join(tmpDir, 'input.json');
  await fs.writeFile(inputPath, `${JSON.stringify(input)}\n`, 'utf8');

  const args = ['eval', '-f', 'json', '-d', path.join(repoRoot, 'policy', 'skills')];
  if (overlayPolicyPath) {
    args.push('-d', overlayPolicyPath);
  }
  args.push('-i', inputPath, 'data.summit.skills');

  try {
    const result = await runCommand('opa', args, repoRoot);
    if (result.code !== 0) {
      return { allow: false, denies: [result.stderr.trim() || 'OPA evaluation failed'] };
    }
    const parsed = JSON.parse(result.stdout) as {
      result?: Array<{ expressions: Array<{ value?: { allow?: boolean; deny?: string[] } }> }>;
    };
    const value = parsed.result?.[0]?.expressions?.[0]?.value;
    const allow = Boolean(value?.allow);
    const denies = Array.isArray(value?.deny) ? value?.deny : [];
    return { allow, denies };
  } catch (error) {
    return { allow: false, denies: ['OPA not available or evaluation failed'] };
  }
};

const gitDiffSummary = async (): Promise<{ files: string[]; summary: string }> => {
  const nameOutput = await runCommand('git', ['diff', '--name-only'], repoRoot);
  const files = nameOutput.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const summaryOutput = await runCommand('git', ['diff', '--stat'], repoRoot);
  return { files, summary: summaryOutput.stdout.trim() };
};

const checksumsForFiles = async (files: string[]): Promise<Record<string, string>> => {
  const checksums: Record<string, string> = {};
  for (const file of files) {
    const absPath = path.join(repoRoot, file);
    try {
      const content = await fs.readFile(absPath);
      const hash = createHash('sha256').update(content).digest('hex');
      checksums[file] = hash;
    } catch (error) {
      continue;
    }
  }
  return checksums;
};

const resolveSkillPath = (skillName: string): string =>
  path.join(externalDir, skillName);

const resolveOverlayPolicyPath = async (
  skillName: string,
): Promise<string | undefined> => {
  const overlayPath = path.join(overlayDir, skillName, 'SUMMIT.policy.rego');
  try {
    await fs.access(overlayPath);
    return overlayPath;
  } catch (error) {
    return undefined;
  }
};

const parseSkillNameFromUrl = (sourceUrl: string): string => {
  const trimmed = sourceUrl.replace(/\/$/, '');
  const base = trimmed.split('/').pop() ?? 'skill';
  return base.replace(/\.git$/, '');
};

const ensureSkillAvailable = async (skillName: string): Promise<void> => {
  const skillPath = resolveSkillPath(skillName);
  try {
    await fs.access(skillPath);
  } catch (error) {
    throw new Error(`Skill ${skillName} not found in ${skillPath}`);
  }
};

const updateRegistryEntry = (
  registry: SkillRegistry,
  entry: SkillLockEntry,
): SkillRegistry => {
  const existing = registry.skills.filter((skill) => skill.name !== entry.name);
  return {
    ...registry,
    generated_at: new Date().toISOString(),
    skills: [...existing, entry],
  };
};

const updateManifestEntry = (
  manifest: SkillManifest,
  entry: SkillManifestEntry,
): SkillManifest => {
  const existing = manifest.skills.filter((skill) => skill.name !== entry.name);
  return {
    ...manifest,
    generated_at: new Date().toISOString(),
    skills: [...existing, entry],
  };
};

const command = new Command();
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
      await fs.access(destination);
      throw new Error(`Skill ${name} already exists at ${destination}`);
    } catch (error) {
      // continue
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-skill-'));
    const toolCalls: Array<Record<string, unknown>> = [];

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
    const displayName =
      (frontmatter.name as string | undefined) ??
      (frontmatter.title as string | undefined) ??
      name;

    const registry = await loadRegistry();
    const manifest = await loadManifest();

    const updatedRegistry = updateRegistryEntry(registry, {
      name,
      source: sourceUrl,
      commit: options.commit,
      sha256,
      path: path.relative(repoRoot, destination),
    });

    const updatedManifest = updateManifestEntry(manifest, {
      name,
      display_name: displayName,
      source: sourceUrl,
      commit: options.commit,
      sha256,
      overlay: path.relative(repoRoot, path.join(overlayDir, name)),
      status: 'active',
      governed_exception: false,
      domains: Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : [],
    });

    await writeRegistry(updatedRegistry);
    await writeManifest(updatedManifest);

    const diffSummary = await gitDiffSummary();
    const evidenceBundle = buildEvidenceBundle({
      skill: name,
      inputs: { sourceUrl, commit: options.commit },
      tool_calls: toolCalls,
      outputs: { destination, sha256 },
      diffs: diffSummary,
      checksums: await checksumsForFiles(diffSummary.files),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeEvidenceBundle(path.join(evidenceDir, timestamp), evidenceBundle, 'skill-add.json');

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

    const failures: string[] = [];

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
      const evidenceBundle = buildEvidenceBundle({
        skill: target,
        inputs: policyInput,
        outputs: { findings },
        policy,
        diffs: diffSummary,
        checksums: await checksumsForFiles(diffSummary.files),
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await writeEvidenceBundle(
        path.join(evidenceDir, timestamp),
        evidenceBundle,
        'skill-vet.json',
      );

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
    const runConfigPath = path.join(overlayDir, skill, 'SUMMIT.run.json');
    let runConfig: { command: string; args?: string[]; permissions?: RequestedPermissions } | null =
      null;
    try {
      const configContent = await fs.readFile(runConfigPath, 'utf8');
      runConfig = JSON.parse(configContent) as {
        command: string;
        args?: string[];
        permissions?: RequestedPermissions;
      };
    } catch (error) {
      if (options.apply) {
        throw new Error(`Missing run configuration at ${runConfigPath}`);
      }
    }

    const requested: RequestedPermissions = runConfig?.permissions ?? {
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

    const policy = await evaluatePolicy(
      policyInput,
      await resolveOverlayPolicyPath(skill),
    );

    if (!policy.allow && options.apply) {
      throw new Error(`Policy denied run: ${policy.denies.join('; ')}`);
    }

    const toolCalls: Array<Record<string, unknown>> = [];
    const outputs: Record<string, unknown> = {};
    if (options.apply && runConfig) {
      const result = await runCommand(
        runConfig.command,
        runConfig.args ?? [],
        resolveSkillPath(skill),
        sanitizeEnv(),
      );
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
    const evidenceBundle = buildEvidenceBundle({
      skill,
      inputs: { run: runConfig ?? { dryRun: true }, policyInput },
      tool_calls: toolCalls,
      outputs,
      policy,
      diffs: diffSummary,
      checksums: await checksumsForFiles(diffSummary.files),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeEvidenceBundle(path.join(evidenceDir, timestamp), evidenceBundle, 'skill-run.json');
  });

command.parseAsync(process.argv);
