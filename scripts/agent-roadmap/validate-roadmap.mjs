import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const ROADMAP_PATH = path.join(ROOT, 'configs/agent-roadmap/ROADMAP.yaml');

const roadmapRaw = fs.readFileSync(ROADMAP_PATH, 'utf8');
const roadmap = yaml.load(roadmapRaw);
const sprints = roadmap.sprints ?? [];

const ids = new Set();
const errors = [];

sprints.forEach((sprint, index) => {
  if (!sprint.id) {
    errors.push(`Sprint at index ${index} missing id.`);
    return;
  }
  if (ids.has(sprint.id)) {
    errors.push(`Duplicate sprint id detected: ${sprint.id}`);
  }
  ids.add(sprint.id);
  if (!sprint.prompt_path) {
    errors.push(`Sprint ${sprint.id} missing prompt_path.`);
    return;
  }
  const promptPath = path.join(ROOT, sprint.prompt_path);
  if (!fs.existsSync(promptPath)) {
    errors.push(`Prompt path not found for ${sprint.id}: ${sprint.prompt_path}`);
  }
});

if (errors.length > 0) {
  console.error('Agent roadmap validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Agent roadmap validation passed (${sprints.length} sprints).`);
