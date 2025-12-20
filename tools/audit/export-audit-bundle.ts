#!/usr/bin/env ts-node

import path from 'path';
import { writeFile } from 'fs/promises';
import { buildAuditBundle } from '../../server/src/disclosure/audit-bundle.js';

type ArgMap = Record<string, string>;

function parseArgs(argv: string[]): ArgMap {
  return argv.reduce((acc, curr) => {
    if (curr.startsWith('--')) {
      const [key, value = 'true'] = curr.replace(/^--/, '').split('=');
      acc[key] = value;
    }
    return acc;
  }, {} as ArgMap);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = args.tenant || args.tenantId || 'default';
  const startTime =
    args.start || args.from
      ? new Date(args.start || args.from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endTime = args.end ? new Date(args.end) : new Date();
  const format = (args.format as 'tar' | 'zip' | undefined) ?? 'tar';
  const output = args.out ? path.resolve(args.out) : undefined;

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new Error('Invalid start or end time supplied');
  }

  const bundle = await buildAuditBundle({
    tenantId,
    startTime,
    endTime,
    format,
    outputPath: output,
  });

  const checksumPath = `${bundle.bundlePath}.sha256`;
  await writeFile(
    checksumPath,
    `${bundle.sha256}  ${path.basename(bundle.bundlePath)}\n`,
    'utf8',
  );

  // Emit CLI-friendly summary
  console.log('✅ Audit bundle generated');
  console.log(`  tenant: ${tenantId}`);
  console.log(`  window: ${startTime.toISOString()} - ${endTime.toISOString()}`);
  console.log(`  bundle: ${bundle.bundlePath}`);
  console.log(`  sha256: ${bundle.sha256}`);
  console.log(`  checksums: ${checksumPath}`);
}

main().catch((err) => {
  console.error('Failed to build audit bundle:', err?.message || err);
  process.exitCode = 1;
});
