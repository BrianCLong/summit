import { readFile } from 'fs/promises';
import path from 'path';
import type { SkillReference } from '../types.js';

const skillsRoot = path.resolve('skills/mcp');

const parseToc = (content: string): string[] =>
  content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.replace(/^##\s+/, '').trim());

export class SkillsRegistry {
  private skills: SkillReference[];

  constructor(skills: SkillReference[]) {
    this.skills = skills;
  }

  static async load(): Promise<SkillsRegistry> {
    const skills: SkillReference[] = [
      {
        id: 'mcp-auth',
        name: 'MCP Auth & Scopes',
        summary: 'Scopes, tenant routing, and least-privilege guardrails.',
        toc: [],
        filePath: path.join(skillsRoot, 'auth', 'SKILL.md'),
      },
      {
        id: 'mcp-policy',
        name: 'Policy Gate',
        summary: 'Policy-as-code checks and break-glass controls.',
        toc: [],
        filePath: path.join(skillsRoot, 'policy', 'SKILL.md'),
      },
      {
        id: 'mcp-evidence',
        name: 'Evidence & Provenance',
        summary: 'Evidence bundle generation and audit trail steps.',
        toc: [],
        filePath: path.join(skillsRoot, 'evidence', 'SKILL.md'),
      },
      {
        id: 'mcp-transport',
        name: 'Transports',
        summary: 'STDIO + SSE transport practices and constraints.',
        toc: [],
        filePath: path.join(skillsRoot, 'transport', 'SKILL.md'),
      },
    ];

    const resolvedSkills = await Promise.all(
      skills.map(async (skill) => {
        const content = await readFile(skill.filePath, 'utf-8');
        return { ...skill, toc: parseToc(content) };
      }),
    );

    return new SkillsRegistry(resolvedSkills);
  }

  list(): SkillReference[] {
    return [...this.skills].sort((a, b) => a.id.localeCompare(b.id));
  }

  getSkill(skillId: string): SkillReference {
    const skill = this.skills.find((entry) => entry.id === skillId);
    if (!skill) {
      throw new Error(`Unknown skill: ${skillId}`);
    }
    return skill;
  }

  async getSkillSection(skillId: string, section: string): Promise<string> {
    const skill = this.getSkill(skillId);
    const content = await readFile(skill.filePath, 'utf-8');
    const sections = content.split(/\n## /g);
    const matched = sections.find((entry) =>
      entry.toLowerCase().startsWith(section.toLowerCase()),
    );
    if (!matched) {
      throw new Error(`Section not found: ${section}`);
    }
    const normalized = matched.startsWith('#') ? matched : `## ${matched}`;
    return normalized.trim();
  }
}
