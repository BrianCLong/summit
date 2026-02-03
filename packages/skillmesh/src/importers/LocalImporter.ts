import * as path from 'path';
import * as fs from 'fs-extra';
import { Skill } from '../core/types';
import { LocalSkillRegistry } from '../registry/LocalSkillRegistry';

export class LocalImporter {
  async import(localPath: string): Promise<Skill[]> {
    if (!await fs.pathExists(localPath)) {
      throw new Error(`Path not found: ${localPath}`);
    }

    const skills: Skill[] = [];

    // Check for manifest at path
    if (await fs.pathExists(path.join(localPath, 'manifest.json'))) {
      const skill = await LocalSkillRegistry.createSkillFromPath(localPath, {
        type: 'local',
        path: localPath
      });
      skills.push(skill);
    } else {
       // Scan subdirs
       const entries = await fs.readdir(localPath, { withFileTypes: true });
       for (const entry of entries) {
         if (entry.isDirectory()) {
           const subDir = path.join(localPath, entry.name);
           if (await fs.pathExists(path.join(subDir, 'manifest.json'))) {
             try {
                const skill = await LocalSkillRegistry.createSkillFromPath(subDir, {
                  type: 'local',
                  path: subDir
                });
                skills.push(skill);
             } catch (e) {
                console.warn(`Skipping invalid skill in ${subDir}: ${e}`);
             }
           }
         }
       }
    }

    return skills;
  }
}
