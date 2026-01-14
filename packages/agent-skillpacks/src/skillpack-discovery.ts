import fs from 'fs/promises';
import path from 'path';
import {
  type SkillpackDefinition,
  type SkillpackFrontmatter,
} from './types';
import { fileExists, parseFrontmatter, readTextFile } from './utils';

export async function discoverSkillpacks(
  rootDir: string,
): Promise<SkillpackDefinition[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const skillpacks: SkillpackDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDir = path.join(rootDir, entry.name);
    const skillMarkdownPath = path.join(skillDir, 'SKILL.md');
    if (!(await fileExists(skillMarkdownPath))) {
      continue;
    }
    const skillMarkdown = await readTextFile(skillMarkdownPath);
    const frontmatter = parseFrontmatter(skillMarkdown);
    skillpacks.push(await buildDefinition(frontmatter, skillDir, skillMarkdownPath));
  }

  return skillpacks;
}

async function buildDefinition(
  frontmatter: SkillpackFrontmatter,
  skillDir: string,
  skillMarkdownPath: string,
): Promise<SkillpackDefinition> {
  const mcpConfigPath = path.join(skillDir, 'mcp.json');
  const policyPath = path.join(skillDir, 'policy.json');
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    triggers: frontmatter.triggers,
    shardHints: frontmatter.shards ?? {},
    directory: skillDir,
    skillMarkdownPath,
    mcpConfigPath: (await fileExists(mcpConfigPath)) ? mcpConfigPath : undefined,
    policyPath: (await fileExists(policyPath)) ? policyPath : undefined,
  };
}
