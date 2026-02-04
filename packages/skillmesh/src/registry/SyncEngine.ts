import { Adapter, Skill } from '../core/types';

export class SyncEngine {
  constructor(private adapters: Adapter[]) {}

  async syncSkill(skill: Skill): Promise<void> {
    console.log(`Syncing skill: ${skill.manifest.name}`);

    for (const adapter of this.adapters) {
      const isDetected = await adapter.detect();
      if (!isDetected) {
        console.log(`Tool ${adapter.name} not detected, skipping.`);
        continue;
      }

      const target = await adapter.getInstallTarget(skill);
      if (target) {
        console.log(`Installing ${skill.manifest.name} to ${adapter.name} at ${target.location} (mode: ${target.mode})`);
        await adapter.install(skill, target);
      } else {
        console.log(`No install target for ${skill.manifest.name} on ${adapter.name}`);
      }
    }
  }

  async syncAll(skills: Skill[]): Promise<void> {
    for (const skill of skills) {
      await this.syncSkill(skill);
    }
  }
}
