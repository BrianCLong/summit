import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface EncryptionStats {
  count: number;
  totalBytes: number;
  averageBytes: number;
}

export interface HomomorphicResult {
  ciphertext: string;
  ciphertextBytes: number;
  inputCiphertextBytes: number;
  latencyMicros: number;
  plaintext: number;
  encryptionStats: EncryptionStats;
}

export interface EncryptResult {
  ciphertexts: string[];
  stats: EncryptionStats;
}

export interface FhemClientOptions {
  cliPath?: string;
  manifestPath?: string;
}

interface CliEncryptResponse {
  ciphertexts: string[];
  stats: { count: number; total_bytes: number };
}

interface ServiceResponse {
  ciphertext: string;
  ciphertext_bytes: number;
  input_ciphertext_bytes: number;
  latency_micros: number;
}

export class FhemClient {
  private readonly baseUrl: string;
  private readonly cliPath?: string;
  private readonly manifestPath: string;

  constructor(baseUrl = 'http://localhost:8080', options?: FhemClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cliPath = options?.cliPath;
    const defaultManifest = resolve(
      fileURLToPath(new URL('../../../../', import.meta.url)),
      'services/fhem/Cargo.toml'
    );
    this.manifestPath = options?.manifestPath ?? defaultManifest;
  }

  encrypt(values: number[]): EncryptResult {
    if (values.length === 0) {
      return {
        ciphertexts: [],
        stats: { count: 0, totalBytes: 0, averageBytes: 0 },
      };
    }

    const args = ['encrypt', ...values.map((value) => value.toString())];
    const output = this.runCli(args);
    const parsed = JSON.parse(output) as CliEncryptResponse;
    const stats = this.toStats(parsed.stats);
    return { ciphertexts: parsed.ciphertexts, stats };
  }

  decrypt(ciphertext: string): number {
    const stdout = this.runCli(['decrypt', '--ciphertext', ciphertext]);
    return Number.parseInt(stdout.trim(), 10);
  }

  async encSum(values: number[]): Promise<HomomorphicResult> {
    return this.executeHomomorphic('/enc-sum', values);
  }

  async encCount(values: number[]): Promise<HomomorphicResult> {
    return this.executeHomomorphic('/enc-count', values);
  }

  private async executeHomomorphic(path: string, values: number[]): Promise<HomomorphicResult> {
    const { ciphertexts, stats } = this.encrypt(values);
    if (ciphertexts.length === 0) {
      throw new Error('ciphertexts must not be empty');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ciphertexts }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Service error ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as ServiceResponse;
    const plaintext = this.decrypt(payload.ciphertext);
    return {
      ciphertext: payload.ciphertext,
      ciphertextBytes: payload.ciphertext_bytes,
      inputCiphertextBytes: payload.input_ciphertext_bytes,
      latencyMicros: payload.latency_micros,
      plaintext,
      encryptionStats: stats,
    };
  }

  private runCli(args: string[]): string {
    if (this.cliPath) {
      const result = spawnSync(this.cliPath, args, { encoding: 'utf8' });
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        throw new Error(result.stderr || 'fhem-cli execution failed');
      }
      return result.stdout.trim();
    }

    const result = spawnSync(
      'cargo',
      ['run', '--quiet', '--manifest-path', this.manifestPath, '--bin', 'fhem-cli', '--', ...args],
      { encoding: 'utf8' }
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || 'cargo execution failed');
    }

    return result.stdout.trim();
  }

  private toStats(raw: { count: number; total_bytes: number }): EncryptionStats {
    const average = raw.count === 0 ? 0 : raw.total_bytes / raw.count;
    return {
      count: raw.count,
      totalBytes: raw.total_bytes,
      averageBytes: average,
    };
  }
}
