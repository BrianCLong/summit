import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const registryPath = path.join(rootDir, 'skills/registry.yaml');
const packPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(rootDir, 'skills/packs/summit-baseline.yaml');

console.log(`Loading registry from ${registryPath}`);
console.log(`Loading pack from ${packPath}`);

if (!fs.existsSync(registryPath)) {
  console.error('Registry file not found!');
  process.exit(1);
}

if (!fs.existsSync(packPath)) {
  console.error('Pack file not found!');
  process.exit(1);
}

const registry = yaml.load(fs.readFileSync(registryPath, 'utf8'));
const pack = yaml.load(fs.readFileSync(packPath, 'utf8'));

console.log(`Installing pack: ${pack.name} v${pack.version}`);

let hasErrors = false;

for (const skill of pack.skills) {
  console.log(`Checking skill: ${skill.name}`);

  // Find skill in registry
  let registryEntry = null;
  let registrySkill = null;

  for (const entry of registry.registry) {
    if (skill.source.includes(entry.source) || entry.source.includes(skill.source)) {
        registryEntry = entry;
        registrySkill = entry.skills.find(s => s.name === skill.name);
        if (registrySkill) break;
    }
  }

  if (!registrySkill) {
    console.error(`  ❌ Skill ${skill.name} from ${skill.source} not found in registry!`);
    hasErrors = true;
    continue;
  }

  // Construct expected path
  let skillPath;
  if (registryEntry.source.startsWith('internal/')) {
      skillPath = path.join(rootDir, registrySkill.path);
  } else {
      // For external, we expect it in vendored
      // Construct path based on source and sha
      const repoName = registryEntry.source.replace('github.com/', '').replace('/', '__');
      skillPath = path.join(rootDir, 'skills/vendored', repoName, registryEntry.sha, registrySkill.path);
  }

  if (fs.existsSync(skillPath)) {
    console.log(`  ✅ Found at ${skillPath}`);
  } else {
    console.error(`  ❌ Skill not found at expected path: ${skillPath}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('Installation/Verification failed with errors.');
  process.exit(1);
} else {
  console.log('All skills verified successfully.');
}
