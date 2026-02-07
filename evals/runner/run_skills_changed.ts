/* eslint-disable no-console */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSuiteMarkdown } from './report.js';
import { readJson, ensureDir } from './filesystem.js';
import { ScoreSummary } from './types.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const runGit = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || 'git command failed'));
      } else {
        resolve(output.trim());
      }
    });
  });

const findChangedSkills = async (): Promise<string[]> => {
  const baseRef = process.env.EVAL_SKILL_BASE_REF ?? 'origin/main';
  const mergeBase = await runGit(['merge-base', 'HEAD', baseRef]);
  const diff = await runGit(['diff', '--name-only', mergeBase]);
  const skills = new Set<string>();
  diff
    .split(/\r?\n/)
    .filter((line) => line.startsWith('evals/skills/'))
    .forEach((line) => {
      const parts = line.split('/');
      if (parts.length >= 3) {
        skills.add(parts[2]);
      }
    });
  return Array.from(skills);
};

const runSkill = async (skill: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'evals/runner/run_skill_eval.ts', '--skill', skill], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Skill ${skill} failed with code ${code}`));
      }
    });
  });
};

const loadLatestSummary = (skill: string): Promise<ScoreSummary> => {
  const summaryPath = path.join(
    repoRoot,
    'evals',
    'skills',
    skill,
    'artifacts',
    'latest.json',
  );
  return readJson<ScoreSummary>(summaryPath);
};

const run = async () => {
  const skills = await findChangedSkills();
  if (skills.length === 0) {
    console.log('No changed skills detected.');
    return;
  }
  for (const skill of skills) {
    await runSkill(skill);
  }
  const summaries = await Promise.all(skills.map(loadLatestSummary));
  const reportDir = path.join(repoRoot, 'evals', 'runner', 'reports');
  await ensureDir(reportDir);
  await writeSuiteMarkdown(path.join(reportDir, 'changed-skills.md'), summaries);
  await fs.writeFile(
    path.join(reportDir, 'changed-skills.json'),
    `${JSON.stringify(summaries, null, 2)}\n`,
    'utf8',
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
