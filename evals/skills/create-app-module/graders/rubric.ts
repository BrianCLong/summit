import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { RubricResult, TraceEvent } from '../../../runner/types.js';

const hasSections = (content: string, sections: string[]): boolean =>
  sections.every((section) => content.includes(section));

export const grade = async ({
  skillDir,
}: {
  trace: TraceEvent[];
  skillDir: string;
  repoRoot: string;
}): Promise<RubricResult> => {
  const checks = [];
  let passed = 0;

  const skillDoc = await fs.readFile(path.join(skillDir, 'skill.md'), 'utf8');
  const docPass = hasSections(skillDoc, [
    '## Definition',
    '## Success Criteria',
    '## Constraints',
    '## Definition of Done',
  ]);
  checks.push({
    id: 'documentation-completeness',
    pass: docPass,
    notes: docPass ? undefined : 'skill.md missing required sections',
  });
  if (docPass) {
    passed += 1;
  }

  const promptsRaw = await fs.readFile(path.join(skillDir, 'prompts.csv'), 'utf8');
  const promptCount = promptsRaw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;
  const promptPass = promptCount >= 11 && promptCount <= 21;
  checks.push({
    id: 'prompt-coverage',
    pass: promptPass,
    notes: promptPass
      ? undefined
      : `Expected 10-20 prompts, found ${promptCount - 1}`,
  });
  if (promptPass) {
    passed += 1;
  }

  const configRaw = await fs.readFile(
    path.join(skillDir, 'configs', 'run.yaml'),
    'utf8',
  );
  const config = yaml.load(configRaw) as { allowed_tools?: string[]; forbidden_paths?: string[] };
  const configPass =
    Array.isArray(config.allowed_tools) &&
    config.allowed_tools.length > 0 &&
    Array.isArray(config.forbidden_paths) &&
    config.forbidden_paths.length > 0;
  checks.push({
    id: 'config-alignment',
    pass: configPass,
    notes: configPass ? undefined : 'run.yaml missing tool/path constraints',
  });
  if (configPass) {
    passed += 1;
  }

  const score = Math.round((passed / checks.length) * 100);
  return {
    overall_pass: checks.every((check) => check.pass),
    score,
    checks,
  };
};
