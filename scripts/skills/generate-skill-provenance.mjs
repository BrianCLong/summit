import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  loadRegistry,
  loadPack,
  resolveSkillDirectory,
  listFilesRecursive,
  hashFile,
  ensureDir,
} from './skill-registry.mjs';

const registryPath = process.argv[2] ?? 'skills/registry.yaml';
const packPath = process.argv[3] ?? 'skills/packs/summit-baseline.yaml';
const outputDir = process.argv[4] ?? 'artifacts/skill-provenance';

const registry = await loadRegistry(registryPath);
const pack = await loadPack(packPath);

const provenance = {
  pack: pack.pack.id,
  registry: registryPath,
  skills: [],
};

for (const skill of pack.pack.skills) {
  const skillDir = resolveSkillDirectory({
    registry,
    sourceId: skill.source,
    skillPath: skill.path,
  });
  const files = await listFilesRecursive(skillDir);
  const entries = [];
  for (const filePath of files) {
    const digest = await hashFile(filePath);
    entries.push({
      path: path.relative(skillDir, filePath),
      sha256: digest,
    });
  }
  provenance.skills.push({
    id: skill.id,
    source: skill.source,
    path: skill.path,
    vendor_path: skillDir,
    files: entries,
  });
}

await ensureDir(outputDir);
const outputPath = path.join(outputDir, `${pack.pack.id}.json`);
await fs.writeFile(outputPath, JSON.stringify(provenance, null, 2), 'utf8');

console.log(`Generated skill provenance: ${outputPath}`);
