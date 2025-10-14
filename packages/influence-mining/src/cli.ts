#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { InfluenceNetworkExtractor } from './InfluenceNetworkExtractor.js';
import { SourceData, SocialPost } from './types.js';

interface CliArgs {
  input: string;
  output: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part.startsWith('--')) {
      const key = part.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }
      args[key] = value;
      i += 1;
    }
  }

  const input = args.input ?? args.i;
  const output = args.output ?? args.o;
  if (!input || !output) {
    throw new Error('Usage: npm run extract -- --input <file> --output <file>');
  }

  return { input, output };
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

function resolveInputPath(filePath: string): string {
  const candidates = [
    path.resolve(process.cwd(), filePath),
    path.resolve(packageRoot, filePath),
    path.resolve(repoRoot, filePath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function loadSourceData(filePath: string): SourceData[] {
  const resolved = resolveInputPath(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input file not found: ${resolved}`);
  }

  const ext = path.extname(resolved).toLowerCase();
  if (ext === '.json') {
    const raw = fs.readFileSync(resolved, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return [{ kind: 'social', posts: parsed as SocialPost[] }];
    }
    if (parsed.kind) {
      return [parsed as SourceData];
    }
    if (parsed.posts || parsed.documents) {
      const sources: SourceData[] = [];
      if (parsed.posts) {
        sources.push({ kind: 'social', posts: parsed.posts });
      }
      if (parsed.documents) {
        sources.push({ kind: 'text', documents: parsed.documents });
      }
      return sources;
    }
    throw new Error('Unsupported JSON structure for input data');
  }

  if (ext === '.csv') {
    const raw = fs.readFileSync(resolved, 'utf-8');
    const [header, ...rows] = raw.split(/\r?\n/).filter(Boolean);
    const columns = header.split(',').map((col) => col.trim());
    const posts: SocialPost[] = rows.map((row, index) => {
      const values = row.split(',').map((value) => value.trim());
      const record: Record<string, string> = {};
      columns.forEach((col, colIndex) => {
        record[col] = values[colIndex] ?? '';
      });
      return {
        id: record.id ?? `row-${index}`,
        author: record.author ?? 'unknown',
        text: record.text ?? '',
        timestamp: record.timestamp ?? new Date().toISOString(),
        inReplyTo: record.inReplyTo || undefined,
        sharedFrom: record.sharedFrom || undefined,
      };
    });
    return [{ kind: 'social', posts }];
  }

  throw new Error(`Unsupported input format: ${ext}`);
}

function main(): void {
  try {
    const args = parseArgs(process.argv.slice(2));
    const sources = loadSourceData(args.input);
    const extractor = new InfluenceNetworkExtractor();
    const network = extractor.extract(sources);
    const enriched = extractor.enrich(network);
    const ranked = extractor.rankNodes(enriched);
    const output = { ...enriched, rankings: ranked.rankings };
    fs.writeFileSync(path.resolve(args.output), JSON.stringify(output, null, 2));
    // eslint-disable-next-line no-console
    console.log(`Wrote influence network to ${path.resolve(args.output)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(message);
    process.exitCode = 1;
  }
}

main();
