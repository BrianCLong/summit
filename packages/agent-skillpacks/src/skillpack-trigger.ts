import { minimatch } from 'minimatch';
import { type SkillpackDefinition } from './types';

export interface TriggerMatch {
  skillpack: SkillpackDefinition;
  matchedTrigger: string;
}

export function matchSkillpacksByTrigger(
  skillpacks: SkillpackDefinition[],
  trigger: string,
): TriggerMatch[] {
  const matches: TriggerMatch[] = [];
  for (const skillpack of skillpacks) {
    for (const pattern of skillpack.triggers) {
      if (pattern === trigger || minimatch(trigger, pattern)) {
        matches.push({ skillpack, matchedTrigger: pattern });
        break;
      }
    }
  }
  return matches;
}
