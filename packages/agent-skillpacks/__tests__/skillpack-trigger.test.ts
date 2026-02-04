import { matchSkillpacksByTrigger } from '../src/skillpack-trigger';
import { type SkillpackDefinition } from '../src/types';

const skillpacks: SkillpackDefinition[] = [
  {
    name: 'ui-preview',
    description: 'UI preview',
    triggers: ['ui-preview', 'ui-*'],
    shardHints: {},
    directory: '/tmp/ui-preview',
    skillMarkdownPath: '/tmp/ui-preview/SKILL.md',
  },
  {
    name: 'security-audit',
    description: 'Security audit',
    triggers: ['security', 'audit-*'],
    shardHints: {},
    directory: '/tmp/security-audit',
    skillMarkdownPath: '/tmp/security-audit/SKILL.md',
  },
];

test('matchSkillpacksByTrigger matches exact trigger', () => {
  const matches = matchSkillpacksByTrigger(skillpacks, 'ui-preview');
  expect(matches).toHaveLength(1);
  expect(matches[0].skillpack.name).toBe('ui-preview');
  expect(matches[0].matchedTrigger).toBe('ui-preview');
});

test('matchSkillpacksByTrigger matches glob trigger', () => {
  const matches = matchSkillpacksByTrigger(skillpacks, 'audit-weekly');
  expect(matches).toHaveLength(1);
  expect(matches[0].skillpack.name).toBe('security-audit');
  expect(matches[0].matchedTrigger).toBe('audit-*');
});
