import type { Skill, SkillId, SkillSpec } from './abi.js';

export interface SkillRegistration {
  spec: SkillSpec;
  impl: Skill;
}

export class SkillRegistry {
  private readonly skills = new Map<SkillId, SkillRegistration>();

  registerSkill(spec: SkillSpec, impl: Skill): void {
    if (this.skills.has(spec.id)) {
      throw new Error(`Skill with id ${spec.id} is already registered`);
    }
    this.skills.set(spec.id, { spec, impl });
  }

  getSkill(id: SkillId): SkillRegistration | undefined {
    return this.skills.get(id);
  }

  listSkills(): SkillSpec[] {
    return Array.from(this.skills.values()).map((entry) => entry.spec);
  }

  clear(): void {
    this.skills.clear();
  }
}

export const defaultSkillRegistry = new SkillRegistry();

export const registerSkill = defaultSkillRegistry.registerSkill.bind(defaultSkillRegistry);
export const getSkill = defaultSkillRegistry.getSkill.bind(defaultSkillRegistry);
export const listSkills = defaultSkillRegistry.listSkills.bind(defaultSkillRegistry);
