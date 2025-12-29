#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type EvidenceBundleOptions = {
  receiptId?: string;
  from?: string;
  to?: string;
};

type LedgerEntry = {
  id: string;
  ref: string;
  type: string;
  schema: string;
};

type ReceiptRecord = {
  id: string;
  createdAt: string;
  recordIds: string[];
  ledgerEntries: LedgerEntry[];
  redactions: string[];
};

type EvidenceBundleManifest = {
  manifestVersion: 'evidence-bundle/0.1';
  generatedAt: string;
  input: {
    receiptId?: string;
    timeRange?: {
      from: string;
      to: string;
    };
  };
  schemaVersions: string[];
  receipts: Array<{
    receiptId: string;
    recordIds: string[];
    ledgerEntries: LedgerEntry[];
    redactions: {
      hasRedactions: boolean;
      fields: string[];
    };
  }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'evidence-bundle', 'sample-ledger.json');

function parseArgs(argv: string[]): EvidenceBundleOptions {
  const options: EvidenceBundleOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    switch (current) {
      case '--receipt':
      case '-r':
        options.receiptId = argv[i + 1];
        i += 1;
        break;
      case '--from':
        options.from = argv[i + 1];
        i += 1;
        break;
      case '--to':
        options.to = argv[i + 1];
        i += 1;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        break;
    }
  }

  return options;
}

function printUsage(): void {
  console.error(
    [
      'Usage: npx tsx scripts/export-evidence-bundle.ts (--receipt <id> | --from <iso> --to <iso>)',
      '',
      'Examples:',
      '  npx tsx scripts/export-evidence-bundle.ts --receipt receipt-001',
      '  npx tsx scripts/export-evidence-bundle.ts --from 2024-11-01T00:00:00Z --to 2024-12-31T23:59:59Z',
    ].join('\n'),
  );
}

function loadDataset(): { receipts: ReceiptRecord[] } {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  return { receipts: parsed.receipts as ReceiptRecord[] };
}

function validateOptions(options: EvidenceBundleOptions): void {
  const hasReceipt = Boolean(options.receiptId);
  const hasRange = Boolean(options.from && options.to);

  if (!hasReceipt && !hasRange) {
    printUsage();
    throw new Error('Either --receipt or both --from and --to must be provided.');
  }

  if (hasRange) {
    const fromDate = new Date(options.from as string);
    const toDate = new Date(options.to as string);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new Error('Time range values must be valid ISO-8601 timestamps.');
    }

    if (fromDate.getTime() > toDate.getTime()) {
      throw new Error('The --from value must be earlier than or equal to --to.');
    }
  }
}

function buildSchemaVersions(receipts: ReceiptRecord[]): string[] {
  const versions = new Set<string>();
  receipts.forEach((receipt) => {
    receipt.ledgerEntries.forEach((entry) => versions.add(entry.schema));
  });

  versions.add('Receipt v0.1');

  return Array.from(versions).sort();
}

function normalizeReceipt(receipt: ReceiptRecord): ReceiptRecord {
  return {
    ...receipt,
    recordIds: [...receipt.recordIds].sort(),
    ledgerEntries: [...receipt.ledgerEntries].sort((a, b) => a.id.localeCompare(b.id)),
    redactions: [...receipt.redactions].sort(),
  };
}

export function generateEvidenceBundle(options: EvidenceBundleOptions): EvidenceBundleManifest {
  validateOptions(options);
  const { receipts } = loadDataset();

  const selected = receipts
    .map(normalizeReceipt)
    .filter((receipt) => {
      if (options.receiptId) {
        return receipt.id === options.receiptId;
      }

      const createdAt = new Date(receipt.createdAt).getTime();
      const fromDate = new Date(options.from as string).getTime();
      const toDate = new Date(options.to as string).getTime();
      return createdAt >= fromDate && createdAt <= toDate;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  if (selected.length === 0) {
    throw new Error('No receipts matched the provided criteria.');
  }

  const latestTimestamp = new Date(
    Math.max(...selected.map((receipt) => new Date(receipt.createdAt).getTime())),
  ).toISOString();

  return {
    manifestVersion: 'evidence-bundle/0.1',
    generatedAt: latestTimestamp,
    input: options.receiptId
      ? { receiptId: options.receiptId }
      : { timeRange: { from: options.from as string, to: options.to as string } },
    schemaVersions: buildSchemaVersions(selected),
    receipts: selected.map((receipt) => ({
      receiptId: receipt.id,
      recordIds: receipt.recordIds,
      ledgerEntries: receipt.ledgerEntries,
      redactions: {
        hasRedactions: receipt.redactions.length > 0,
        fields: receipt.redactions,
      },
    })),
  };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  try {
    const manifest = generateEvidenceBundle(options);
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
