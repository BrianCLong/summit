import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { minimatch } from 'minimatch';
import {
  SkillpackManifest,
  SkillpackMcpConfig,
  SkillpackPolicy,
  TriggerContext,
} from './types.js';

const FRONTMATTER_BOUNDARY = '---';

export const parseSkillMarkdown = (content: string): SkillpackManifest => {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
    throw new Error('SKILL.md missing YAML frontmatter.');
  }
  const endIndex = lines.slice(1).findIndex((line) => line.trim() === FRONTMATTER_BOUNDARY);
  if (endIndex === -1) {
    throw new Error('SKILL.md frontmatter not terminated.');
  }
  const frontmatterLines = lines.slice(1, endIndex + 1);
  const frontmatter = yaml.load(frontmatterLines.join('\n')) as {
    name?: string;
    description?: string;
    triggers?: SkillpackManifest['triggers'];
    shards?: string[];
  };
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

export const loadSkillpackManifest = async (skillDir: string): Promise<SkillpackManifest> => {
  const skillPath = path.join(skillDir, 'SKILL.md');
  const content = await fs.readFile(skillPath, 'utf-8');
  return parseSkillMarkdown(content);
};

export const loadMcpConfig = async (
  skillDir: string
): Promise<SkillpackMcpConfig | null> => {
  const mcpPath = path.join(skillDir, 'mcp.json');
  try {
    const content = await fs.readFile(mcpPath, 'utf-8');
    return JSON.parse(content) as SkillpackMcpConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const loadPolicyConfig = async (
  skillDir: string
): Promise<SkillpackPolicy | null> => {
  const policyPath = path.join(skillDir, 'policy.json');
  try {
    const content = await fs.readFile(policyPath, 'utf-8');
    return JSON.parse(content) as SkillpackPolicy;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const listSkillpacks = async (rootDir: string): Promise<string[]> => {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
};

export const matchSkillpackTriggers = (
  manifest: SkillpackManifest,
  context: TriggerContext
): boolean => {
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
  const pathMatch = (context.repoPaths ?? []).some((repoPath) =>
    pathPatterns.some((pattern) => minimatch(repoPath, pattern, { matchBase: true }))
  );

  return taskMatch || keywordMatch || pathMatch;
};

export const discoverSkillpacks = async (options: {
  rootDir: string;
  triggerContext?: TriggerContext;
}): Promise<SkillpackManifest[]> => {
  const names = await listSkillpacks(options.rootDir);
  const manifests = await Promise.all(
    names.map((name) => loadSkillpackManifest(path.join(options.rootDir, name)))
  );
  if (!options.triggerContext) {
    return manifests;
  }
  return manifests.filter((manifest) => matchSkillpackTriggers(manifest, options.triggerContext));
};
