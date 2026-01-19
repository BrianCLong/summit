import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  loadRegistry,
  loadPack,
  resolveSkillDirectory,
  ensureDir,
} from './skill-registry.mjs';

const registryPath = process.argv[2] ?? 'skills/registry.yaml';
const packPath = process.argv[3] ?? 'skills/packs/summit-baseline.yaml';
const destinationRoot = process.argv[4] ?? 'skills/installed';

const registry = await loadRegistry(registryPath);
const pack = await loadPack(packPath);

const installRoot = path.join(destinationRoot, pack.pack.id);
await ensureDir(installRoot);

const manifest = {
  pack: pack.pack.id,
  installed_at: new Date().toISOString(),
  registry: registryPath,
  skills: [],
};

for (const skill of pack.pack.skills) {
  const skillDir = resolveSkillDirectory({
    registry,
    sourceId: skill.source,
    skillPath: skill.path,
  });
  const targetDir = path.join(installRoot, skill.id.replace(/\//g, '__'));
  await ensureDir(targetDir);
  await fs.cp(skillDir, targetDir, { recursive: true });
  manifest.skills.push({
    id: skill.id,
    source: skill.source,
    path: skill.path,
    installed_to: targetDir,
  });
}

await fs.writeFile(
  path.join(installRoot, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8',
);

console.log(`Installed ${manifest.skills.length} skills to ${installRoot}.`);
