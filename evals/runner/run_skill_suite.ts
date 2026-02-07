/* eslint-disable no-console */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, readJson } from './filesystem.js';
import { writeSuiteMarkdown } from './report.js';
import { ScoreSummary } from './types.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const listSkills = async (): Promise<string[]> => {
  const skillsDir = path.join(repoRoot, 'evals', 'skills');
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.'));
};

const runSkill = (skill: string): Promise<void> =>
  new Promise((resolve, reject) => {
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
  const skills = await listSkills();
  for (const skill of skills) {
    await runSkill(skill);
  }
  const summaries = await Promise.all(skills.map(loadLatestSummary));
  const reportDir = path.join(repoRoot, 'evals', 'runner', 'reports');
  await ensureDir(reportDir);
  await writeSuiteMarkdown(path.join(reportDir, 'suite.md'), summaries);
  await fs.writeFile(
    path.join(reportDir, 'suite.json'),
    `${JSON.stringify(summaries, null, 2)}\n`,
    'utf8',
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
