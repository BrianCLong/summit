#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import process from 'process';
import { buildDisclosureBundle, type AttachmentInput } from '../disclosure/packager.js';
import { isDisclosurePackagerEnabled } from '../config/features-config.js';

function usage(): never {
  console.error(
    'Usage: pack --case <id> [--claim <id> ...] [--attachment <path[,name=...,license=...,description=...]> ...] [--output <dir>]'
  );
  process.exit(1);
}

function parseAttachment(value: string): AttachmentInput {
  const segments = value.split(',');
  const attachment: AttachmentInput = {};

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      // Backwards compatibility: treat the first non key/value segment as a path.
      if (!attachment.path && !attachment.uri) {
        attachment.path = path.resolve(trimmed);
      }
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!key || !rawValue) continue;

    switch (key) {
      case 'path':
        attachment.path = path.resolve(rawValue);
        break;
      case 'uri':
      case 'url':
        attachment.uri = rawValue;
        break;
      case 'name':
        attachment.name = rawValue;
        break;
      case 'license':
        attachment.license = rawValue;
        break;
      case 'description':
        attachment.description = rawValue;
        break;
      case 'sha256':
        attachment.sha256 = rawValue;
        break;
      case 'mimeType':
      case 'contentType':
        attachment.mimeType = rawValue;
        break;
      case 'maxSizeBytes':
        attachment.maxSizeBytes = Number.parseInt(rawValue, 10);
        break;
      default:
        break;
    }
  }

  if (!attachment.path && !attachment.uri) {
    throw new Error('Attachment requires a path or uri');
  }

  return attachment;
}

async function main(argv: string[]): Promise<void> {
  if (!argv.length || argv[0] !== 'pack') {
    usage();
  }

  if (!isDisclosurePackagerEnabled()) {
    console.error('disclosure packager feature is disabled');
    process.exit(2);
  }

  let caseId: string | undefined;
  const claimIds: string[] = [];
  const attachments: AttachmentInput[] = [];
  let generationTimestamp: string | undefined;
  let outputDir: string | undefined;

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--case') {
      caseId = argv[++i];
    } else if (arg === '--claim') {
      claimIds.push(argv[++i]);
    } else if (arg === '--attachment') {
      attachments.push(parseAttachment(argv[++i]));
    } else if (arg === '--timestamp') {
      generationTimestamp = argv[++i];
    } else if (arg === '--output') {
      outputDir = path.resolve(argv[++i]);
    } else {
      usage();
    }
  }

  if (!caseId) {
    usage();
  }

  const result = await buildDisclosureBundle({
    caseId,
    claimIds,
    attachments,
    generationTimestamp,
    outputDir,
    requestContext: {
      requestedBy: process.env.USER || 'cli',
      tenantId: process.env.TENANT_ID || 'cli',
      purpose: 'disclosure-cli',
    },
  });

  console.log(
    JSON.stringify(
      {
        bundle: { path: result.bundlePath, sha256: result.bundleSha256 },
        manifest: { path: result.manifestPath, sha256: result.manifestSha256 },
        report: {
          pdf: { path: result.pdfPath, sha256: result.pdfSha256 },
          html: { path: result.htmlPath, sha256: result.htmlSha256 },
        },
        checksums: { path: result.checksumsPath },
      },
      null,
      2,
    ),
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === invokedPath) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
