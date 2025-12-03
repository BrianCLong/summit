import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type SearchMode = 'live' | 'dryRun';

export interface SearchQuery {
  tenantId: string;
  vector: number[];
  topK: number;
  requestedFields?: string[];
  jurisdiction?: string;
  purpose?: string;
}

export interface SearchResult {
  vectorId: string;
  score: number;
  indexId: string;
  policyHash: string;
}

export interface SearchResponse {
  mode: SearchMode;
  results: SearchResult[];
}

export interface PgvrClientOptions {
  fixturePath?: string;
  manifestPath?: string;
  cargoCommand?: string;
  binaryPath?: string;
}

export class PgvrClient {
  private readonly manifestPath: string;
  private readonly fixturePath: string;
  private readonly command: string;
  private readonly useBinary: boolean;

  constructor(options: PgvrClientOptions = {}) {
    const packageDir = path.resolve(
      fileURLToPath(new URL('.', import.meta.url)),
      '..'
    );
    const repoRoot = path.resolve(packageDir, '../../..');
    this.manifestPath =
      options.manifestPath ?? path.resolve(repoRoot, 'pgvr', 'Cargo.toml');
    this.fixturePath =
      options.fixturePath ??
      path.resolve(repoRoot, 'pgvr', 'fixtures', 'sample-fixture.json');

    if (options.binaryPath) {
      this.command = options.binaryPath;
      this.useBinary = true;
    } else {
      this.command = options.cargoCommand ?? 'cargo';
      this.useBinary = false;
    }
  }

  search(query: SearchQuery): SearchResponse {
    return this.execute(query, 'live');
  }

  dryRun(query: SearchQuery): SearchResponse {
    return this.execute(query, 'dryRun');
  }

  private execute(query: SearchQuery, mode: SearchMode): SearchResponse {
    const payload = JSON.stringify({
      ...query,
      requestedFields: query.requestedFields ?? [],
      mode,
    });

    const result = this.useBinary
      ? spawnSync(this.command, ['--fixture', this.fixturePath], {
          input: payload,
          encoding: 'utf8',
        })
      : spawnSync(
          this.command,
          [
            'run',
            '--quiet',
            '--manifest-path',
            this.manifestPath,
            '--bin',
            'pgvr-cli',
            '--',
            '--fixture',
            this.fixturePath,
          ],
          {
            input: payload,
            encoding: 'utf8',
          }
        );

    if (result.error) {
      throw result.error;
    }

    if (typeof result.status === 'number' && result.status !== 0) {
      const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
      throw new Error(
        `pgvr-cli exited with code ${result.status}${stderr ? `: ${stderr}` : ''}`
      );
    }

    if (typeof result.stdout !== 'string' || result.stdout.trim().length === 0) {
      throw new Error('pgvr-cli returned no output');
    }

    return JSON.parse(result.stdout);
  }
}
