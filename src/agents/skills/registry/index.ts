import { BaseSkill } from '../baseSkill';

export interface SkillRegistration {
  id: string;
  skill: BaseSkill<any, any>;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  addedAt: Date;
}

export class SkillRegistry {
  private skills: Map<string, SkillRegistration> = new Map();

  /**
   * Register a new skill in the registry.
   */
  register(skill: BaseSkill<any, any>, version: string = '1.0.0'): void {
    const id = skill.metadata.name;

    if (this.skills.has(id)) {
      console.warn(`Skill with id ${id} is already registered. Overwriting.`);
    }

    this.skills.set(id, {
      id,
      skill,
      version,
      status: 'active',
      addedAt: new Date(),
    });
  }

  /**
   * Unregister a skill from the registry.
   */
  unregister(id: string): boolean {
    return this.skills.delete(id);
  }

  /**
   * Get a skill by ID.
   */
  get(id: string): BaseSkill<any, any> | undefined {
    return this.skills.get(id)?.skill;
  }

  /**
   * Check if a skill exists in the registry.
   */
  has(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * List all registered skills with their metadata.
   */
  list(): { id: string; version: string; description: string; status: string }[] {
    const list: { id: string; version: string; description: string; status: string }[] = [];

    for (const [id, registration] of this.skills.entries()) {
      list.push({
        id,
        version: registration.version,
        description: registration.skill.metadata.description,
        status: registration.status,
      });
    }

    return list;
  }

  /**
   * Find skills that match specific criteria.
   * Basic implementation searches in name and description.
   */
  search(query: string): BaseSkill<any, any>[] {
    const lowercaseQuery = query.toLowerCase();
    const results: BaseSkill<any, any>[] = [];

    for (const registration of this.skills.values()) {
      const { metadata } = registration.skill;
      if (
        metadata.name.toLowerCase().includes(lowercaseQuery) ||
        metadata.description.toLowerCase().includes(lowercaseQuery)
      ) {
        results.push(registration.skill);
      }
    }

    return results;
  }
}

// Export a singleton instance by default
export const defaultSkillRegistry = new SkillRegistry();
