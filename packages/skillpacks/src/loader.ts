import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { SkillManifest } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../schemas/skill.schema.json');
let schema: any;

async function getSchema() {
  if (!schema) {
    const content = await fs.readFile(schemaPath, 'utf-8');
    schema = JSON.parse(content);
  }
  return schema;
}

export class SkillLoader {
  private ajv: Ajv;
  private validate: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  async init() {
    const schema = await getSchema();
    this.validate = this.ajv.compile(schema);
  }

  async loadSkill(filePath: string): Promise<SkillManifest> {
    if (!this.validate) {
      await this.init();
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const data = yaml.load(content) as any;

    const valid = this.validate(data);
    if (!valid) {
      throw new Error(`Skill validation failed for ${filePath}:\n${JSON.stringify(this.validate.errors, null, 2)}`);
    }

    return data as SkillManifest;
  }

  async loadSkillsFromDirectory(dir: string): Promise<SkillManifest[]> {
    const pattern = path.join(dir, '**/skill.yaml');
    // glob returns paths with forward slashes usually, ensuring cross-platform compat
    const files = await glob(pattern, { ignore: '**/node_modules/**' });

    const skills: SkillManifest[] = [];
    for (const file of files) {
      try {
        const skill = await this.loadSkill(file);
        skills.push(skill);
      } catch (error) {
        console.error(`Failed to load skill from ${file}:`, error);
        // We might want to throw or continue depending on strictness.
        // For now, log and continue.
      }
    }
    return skills;
  }
}
