import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  loadRegistry,
  loadPack,
  resolveSource,
  resolveSkillDirectory,
} from './skill-registry.mjs';

const registryPath = process.argv[2] ?? 'skills/registry.yaml';
const packPath = process.argv[3] ?? 'skills/packs/summit-baseline.yaml';

const registry = await loadRegistry(registryPath);
const pack = await loadPack(packPath);

const errors = [];

for (const source of registry.registry.allowlisted_sources) {
  const pinned = source.pinned_sha;
  if (!pinned) {
    errors.push(`Source ${source.id} missing pinned_sha.`);
  }
  if (!source.vendor_path) {
    errors.push(`Source ${source.id} missing vendor_path.`);
  } else {
    try {
      await fs.access(source.vendor_path);
    } catch {
      errors.push(`Source ${source.id} vendor_path missing: ${source.vendor_path}`);
    }
  }
}

for (const skill of pack.pack.skills) {
  try {
    resolveSource(registry, skill.source);
    const skillDir = resolveSkillDirectory({
      registry,
      sourceId: skill.source,
      skillPath: skill.path,
    });
    await fs.access(skillDir);
  } catch (error) {
    errors.push(`Pack skill ${skill.id} invalid: ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error('Skill registry verification failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const summary = {
  registry: path.resolve(registryPath),
  pack: path.resolve(packPath),
  sources: registry.registry.allowlisted_sources.length,
  skills: pack.pack.skills.length,
};

console.log('Skill registry verification passed.');
console.log(JSON.stringify(summary, null, 2));
