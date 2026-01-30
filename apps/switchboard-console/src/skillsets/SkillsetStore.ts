import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { Skillset } from '../types';

export interface SkillsetFile {
  skillset: Skillset;
  path: string;
}

export class SkillsetStore {
  constructor(private readonly baseDir: string) {}

  async list(): Promise<Skillset[]> {
    const entries = await readdir(this.baseDir);
    const skillsets: Skillset[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.yaml')) {
        continue;
      }
      const skillsetFile = await this.load(path.join(this.baseDir, entry));
      skillsets.push(skillsetFile.skillset);
    }

    return skillsets;
  }

  async get(name: string): Promise<Skillset> {
    const skillsetFile = await this.getWithPath(name);
    return skillsetFile.skillset;
  }

  async getWithPath(name: string): Promise<SkillsetFile> {
    const filePath = path.join(this.baseDir, `${name}.yaml`);
    return this.load(filePath);
  }

  private async load(filePath: string): Promise<SkillsetFile> {
    const raw = await readFile(filePath, 'utf-8');
    const data = parse(raw) as {
      name?: string;
      description?: string;
      system_prompt?: string;
    };

    if (!data.name || !data.description || !data.system_prompt) {
      throw new Error(`Invalid skillset file: ${filePath}`);
    }

    return {
      path: filePath,
      skillset: {
        name: data.name,
        description: data.description,
        systemPrompt: data.system_prompt,
      },
    };
  }
}
