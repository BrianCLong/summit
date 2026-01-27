import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { Skill, SkillManifest, SkillSource } from '../core/types';

export class LocalSkillRegistry {
  private registryPath: string;
  private skills: Map<string, Skill> = new Map();

  constructor(registryPath?: string) {
    this.registryPath = registryPath || path.join(os.homedir(), '.skillmesh', 'registry.json');
  }

  async init(): Promise<void> {
    await fs.ensureDir(path.dirname(this.registryPath));
    if (await fs.pathExists(this.registryPath)) {
      const data = await fs.readJson(this.registryPath);
      this.skills = new Map(Object.entries(data));
    }
  }

  async addSkill(skill: Skill): Promise<void> {
    this.skills.set(skill.id, skill);
    await this.save();
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    return this.skills.get(id);
  }

  async listSkills(): Promise<Skill[]> {
    return Array.from(this.skills.values());
  }

  private async save(): Promise<void> {
    await fs.writeJson(this.registryPath, Object.fromEntries(this.skills), { spaces: 2 });
  }

  // Helper to create a skill object from a directory
  static async createSkillFromPath(dir: string, source: SkillSource): Promise<Skill> {
    const manifestPath = path.join(dir, 'manifest.json');
    if (!await fs.pathExists(manifestPath)) {
      throw new Error(`No manifest.json found in ${dir}`);
    }
    const manifest = await fs.readJson(manifestPath) as SkillManifest;

    // Validate manifest basics
    if (!manifest.name || !manifest.version) {
      throw new Error(`Invalid manifest in ${dir}: missing name or version`);
    }

    return {
      id: manifest.name, // Simple ID for now
      manifest,
      source,
      location: dir
    };
  }
}
