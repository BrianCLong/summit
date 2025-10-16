#!/usr/bin/env ts-node
import fs from 'fs';
import yaml from 'js-yaml';

async function main() {
  const cfg = yaml.load(
    fs.readFileSync('config/signing/byok.yaml', 'utf8'),
  ) as any;
  console.log(`rotating signer for ${cfg.tenantId}`);
  // Placeholder for dual-control rotation logic
}

main();
