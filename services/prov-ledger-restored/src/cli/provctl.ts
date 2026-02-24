#!/usr/bin/env node
// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { ledger } from '../lib/ledger.js';

function usage() {
  console.log(`provctl - provenance helper

Commands:
  ingest <file>                Register evidence from file
  claim --evidence <ids> --assertion <json>   Create claim
  export --claim <id> --out <file>            Export manifest
  verify <manifest.json>                      Verify manifest offline
`);
}

function readFileContent(file: string) {
  const data = fs.readFileSync(file);
  if (file.endsWith('.json')) {
    return JSON.parse(data.toString('utf-8'));
  }
  return data;
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (!command || ['-h', '--help'].includes(command)) {
    usage();
    process.exit(0);
  }

  switch (command) {
    case 'ingest': {
      const file = rest[0];
      if (!file) throw new Error('ingest requires a file');
      const content = readFileContent(file);
      const record = ledger.addEvidence({ content, mediaType: path.extname(file).replace('.', '') });
      console.log(JSON.stringify({ evidenceId: record.id, checksum: record.contentHash }, null, 2));
      break;
    }
    case 'claim': {
      const evidenceFlag = rest.indexOf('--evidence');
      const assertionFlag = rest.indexOf('--assertion');
      if (evidenceFlag === -1 || assertionFlag === -1) throw new Error('claim requires --evidence and --assertion');
      const evidenceIds = rest[evidenceFlag + 1].split(',');
      const assertion = JSON.parse(rest[assertionFlag + 1]);
      const claim = ledger.addClaim({ evidenceIds, assertion });
      console.log(JSON.stringify({ claimId: claim.id }, null, 2));
      break;
    }
    case 'export': {
      const claimFlag = rest.indexOf('--claim');
      const outFlag = rest.indexOf('--out');
      if (claimFlag === -1) throw new Error('export requires --claim');
      const claimId = rest[claimFlag + 1];
      const target = outFlag >= 0 ? rest[outFlag + 1] : 'manifest.json';
      const { manifest, serialized } = ledger.exportManifest(claimId);
      fs.writeFileSync(target, serialized);
      console.log(JSON.stringify({ file: target, root: manifest.merkleRoot }, null, 2));
      break;
    }
    case 'verify': {
      const file = rest[0];
      if (!file) throw new Error('verify requires manifest path');
      const manifest = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const result = ledger.verifyManifest(manifest);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    default:
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
