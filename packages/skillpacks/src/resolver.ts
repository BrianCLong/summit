import { minimatch } from 'minimatch';
import { SkillManifest } from './types.js';

export interface ResolveContext {
  files?: string[];
}

export class SkillResolver {
  resolve(query: string, context: ResolveContext, skills: SkillManifest[]): SkillManifest[] {
    const matches: Set<SkillManifest> = new Set();
    const normalizedQuery = query.toLowerCase();

    for (const skill of skills) {
      if (!skill.triggers) continue;

      let matched = false;

      // 1. Intent Match
      if (skill.triggers.intents) {
        for (const intent of skill.triggers.intents) {
          if (normalizedQuery.includes(intent.toLowerCase())) {
            matches.add(skill);
            matched = true;
            break;
          }
        }
      }

      if (matched) continue;

      // 2. Keyword Match
      if (skill.triggers.keywords) {
        for (const keyword of skill.triggers.keywords) {
           if (normalizedQuery.includes(keyword.toLowerCase())) {
             matches.add(skill);
             matched = true;
             break;
           }
        }
      }

      if (matched) continue;

      // 3. File Pattern Match
      if (context.files && skill.triggers.file_patterns) {
        for (const pattern of skill.triggers.file_patterns) {
          for (const file of context.files) {
            if (minimatch(file, pattern)) {
              matches.add(skill);
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
      }
    }

    return Array.from(matches);
  }
}
