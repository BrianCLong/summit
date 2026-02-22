import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { hashBytes } from './hash.js';
import { readManifestFile, writeDeterministicJson } from './manifest.js';

const SECRET_PATTERN = /(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)/i;

async function scanForSecrets(targetDir: string): Promise<string[]> {
  const violations: string[] = [];
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await scanForSecrets(entryPath);
      violations.push(...nested);
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.env')) {
        violations.push(entryPath);
        continue;
      }
      const contents = await fs.readFile(entryPath, 'utf-8');
      if (SECRET_PATTERN.test(contents)) {
        violations.push(entryPath);
      }
    }
  }
  return violations;
}

export async function packAgent(agentDir: string, outputPath?: string): Promise<string> {
  const manifestPath = path.join(agentDir, 'agent.yaml');
  const { raw: manifestRaw } = await readManifestFile(manifestPath);
  const manifestDigest = hashBytes(Buffer.from(manifestRaw));

  const violations = await scanForSecrets(agentDir);
  if (violations.length > 0) {
    const list = violations.map((item) => `- ${item}`).join('\n');
    throw new Error(`Secret material detected in pack input:\n${list}`);
  }

  const archiveName = outputPath ?? `${path.basename(agentDir)}.sadk.tgz`;
  const tarArgs = [
    '--sort=name',
    '--mtime=UTC 1970-01-01',
    '--owner=0',
    '--group=0',
    '--numeric-owner',
    '-czf',
    archiveName,
    '-C',
    agentDir,
    '.',
  ];
  const tarResult = spawnSync('tar', tarArgs, { encoding: 'utf-8' });
  if (tarResult.status !== 0) {
    throw new Error(`tar failed: ${tarResult.stderr || tarResult.stdout}`);
  }

  const report = {
    ok: true,
    agent_dir: agentDir,
    archive: archiveName,
    manifest_digest: manifestDigest,
  };
  await writeDeterministicJson(`${archiveName}.report.json`, report);

  return archiveName;
}
