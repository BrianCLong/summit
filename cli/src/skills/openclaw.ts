import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

export type OpenClawSkillFrontmatter = {
  name: string;
  description?: string;
  metadata?: {
    clawdbot?: {
      emoji?: string;
      homepage?: string;
      requires?: {
        bins?: string[];
        env?: string[];
        config?: string[];
      };
    };
  };
};

export type OpenClawSkillDoc = {
  frontmatter: OpenClawSkillFrontmatter;
  bodyMarkdown: string;
  rawFrontmatter: string;
  raw: string;
};

export type OpenClawSkillRisk = {
  arbitraryTransactions: boolean;
};

export type OpenClawSkillIndexEntry = {
  provider: string;
  skill: string;
  slug: string;
  name: string;
  description?: string;
  metadata?: OpenClawSkillFrontmatter['metadata'];
  sha256: string;
  evidenceId: string;
  risk: OpenClawSkillRisk;
  assets: {
    scripts: string[];
    references: string[];
  };
};

export type OpenClawSkillIndex = {
  schemaVersion: number;
  repo: string;
  commit: string;
  skills: OpenClawSkillIndexEntry[];
};

export type OpenClawEvidenceEntry = {
  provider: string;
  skill: string;
  evidenceId: string;
  sha256: string;
};

export type OpenClawEvidenceBundle = {
  schemaVersion: number;
  repo: string;
  commit: string;
  skills: OpenClawEvidenceEntry[];
};

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
const RISK_PATTERNS = [
  /raw\s+transaction/i,
  /transaction\s+json/i,
  /calldata/i,
  /submit\s+raw/i,
];

export function parseSkillMd(rawInput: string): OpenClawSkillDoc {
  const raw = rawInput.replace(/^\uFEFF/, '');
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('SKILL.md missing frontmatter block');
  }
  const rawFrontmatter = match[1];
  const bodyMarkdown = (match[2] ?? '').trim();
  const parsed = parseYaml(rawFrontmatter) ?? {};
  const frontmatter = normalizeFrontmatter(parsed);
  return {
    frontmatter,
    bodyMarkdown,
    rawFrontmatter,
    raw,
  };
}

export function computeRisk(doc: OpenClawSkillDoc): OpenClawSkillRisk {
  const haystack = `${doc.frontmatter.description ?? ''}\n${doc.bodyMarkdown}`;
  const arbitraryTransactions = RISK_PATTERNS.some((rx) => rx.test(haystack));
  return { arbitraryTransactions };
}

export function discoverOpenClawSkills(
  repoRoot: string,
  options: { provider?: string; skill?: string } = {},
): { provider: string; skill: string; root: string }[] {
  const providers = fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => (!options.provider ? true : name === options.provider));

  const discovered: { provider: string; skill: string; root: string }[] = [];
  for (const provider of providers) {
    const providerRoot = path.join(repoRoot, provider);
    const skills = fs
      .readdirSync(providerRoot, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => (!options.skill ? true : name === options.skill));

    for (const skill of skills) {
      const skillRoot = path.join(providerRoot, skill);
      const skillMd = path.join(skillRoot, 'SKILL.md');
      if (!fs.existsSync(skillMd)) {
        continue;
      }
      discovered.push({ provider, skill, root: skillRoot });
    }
  }

  return discovered.sort((a, b) =>
    `${a.provider}/${a.skill}`.localeCompare(`${b.provider}/${b.skill}`),
  );
}

export function ingestOpenClawRepo(options: {
  repo: string;
  provider?: string;
  skill?: string;
  outputDir: string;
}): OpenClawSkillIndex {
  const { repo, provider, skill, outputDir } = options;
  const { repoRoot, commit } = resolveRepoRoot(repo);
  const skills = discoverOpenClawSkills(repoRoot, { provider, skill });

  if (skills.length === 0) {
    throw new Error('No OpenClaw skills found for the provided filters.');
  }

  const entries: OpenClawSkillIndexEntry[] = skills.map((entry) => {
    const skillMdPath = path.join(entry.root, 'SKILL.md');
    const rawSkillMd = fs.readFileSync(skillMdPath, 'utf-8');
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

  const index: OpenClawSkillIndex = {
    schemaVersion: 1,
    repo,
    commit,
    skills: entries,
  };

  const evidence: OpenClawEvidenceBundle = {
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

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'skill-index.json'),
    JSON.stringify(index, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDir, 'evidence.json'),
    JSON.stringify(evidence, null, 2),
  );

  return index;
}

export function loadSkillIndex(indexPath: string): OpenClawSkillIndex {
  const raw = fs.readFileSync(indexPath, 'utf-8');
  const parsed = JSON.parse(raw) as OpenClawSkillIndex;
  return parsed;
}

function normalizeFrontmatter(parsed: unknown): OpenClawSkillFrontmatter {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('frontmatter must be a YAML mapping');
  }
  const data = parsed as Record<string, unknown>;
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

function normalizeMetadata(
  value: unknown,
): OpenClawSkillFrontmatter['metadata'] | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const metadata = value as Record<string, unknown>;
  const clawdbot = normalizeClawdbot(metadata.clawdbot);
  if (!clawdbot) {
    return undefined;
  }
  return { clawdbot };
}

function normalizeClawdbot(value: unknown):
  | Exclude<OpenClawSkillFrontmatter['metadata'], undefined>['clawdbot']
  | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const clawdbot = value as Record<string, unknown>;
  const requires = normalizeRequires(clawdbot.requires);
  return {
    emoji: toStringValue(clawdbot.emoji) || undefined,
    homepage: toStringValue(clawdbot.homepage) || undefined,
    requires,
  };
}

function normalizeRequires(value: unknown):
  | Exclude<Exclude<OpenClawSkillFrontmatter['metadata'], undefined>['clawdbot'], undefined>['requires']
  | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const requires = value as Record<string, unknown>;
  return {
    bins: toStringArray(requires.bins),
    env: toStringArray(requires.env),
    config: toStringArray(requires.config),
  };
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  return result.length > 0 ? result : undefined;
}

function collectAssets(skillRoot: string): {
  scripts: string[];
  references: string[];
} {
  const scripts = collectFiles(path.join(skillRoot, 'scripts'));
  const references = collectFiles(path.join(skillRoot, 'references'));
  return { scripts, references };
}

function collectFiles(root: string): string[] {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return [];
  }
  const collected: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile()) {
      collected.push(path.join(path.basename(root), entry.name));
    }
  }
  return collected.sort();
}

function resolveRepoRoot(repo: string): { repoRoot: string; commit: string } {
  if (repo.startsWith('file://')) {
    const repoRoot = fileURLToPath(repo);
    return { repoRoot, commit: resolveGitCommit(repoRoot) };
  }
  if (fs.existsSync(repo)) {
    return { repoRoot: repo, commit: resolveGitCommit(repo) };
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-'));
  const repoRoot = path.join(tmpRoot, 'repo');
  const result = spawnSync('git', ['clone', '--depth', '1', repo, repoRoot], {
    stdio: 'ignore',
  });
  if (result.status !== 0) {
    throw new Error('Failed to clone OpenClaw skill repo.');
  }
  return { repoRoot, commit: resolveGitCommit(repoRoot) };
}

function resolveGitCommit(repoRoot: string): string {
  const result = spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
    encoding: 'utf-8',
  });
  if (result.status !== 0 || !result.stdout) {
    return 'unknown';
  }
  return String(result.stdout).trim() || 'unknown';
}

function hashSha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function buildEvidenceId(provider: string, skill: string, sha256: string): string {
  return `EVID:OPENCLAW:${provider}:${skill}:${sha256.slice(0, 8)}`;
}
