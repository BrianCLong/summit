import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import type { SynintMode, SynintSweepResult } from './types.js';

export interface SynintClientConfig {
  mode: SynintMode;
  baseUrl?: string;
  httpTimeoutMs?: number;
  pythonBin?: string;
  cliEntrypoint?: string;
  cliArgsPrefix?: string[];
  maxConcurrency?: number;
  retry?: { attempts: number; backoffMs: number };
}

export class SynintClient {
  private cfg: Required<SynintClientConfig>;

  constructor(cfg: SynintClientConfig) {
    this.cfg = {
      mode: cfg.mode,
      baseUrl: cfg.baseUrl ?? 'http://localhost:8080',
      httpTimeoutMs: cfg.httpTimeoutMs ?? 120_000,
      pythonBin: cfg.pythonBin ?? 'python3',
      cliEntrypoint: cfg.cliEntrypoint ?? 'main.py',
      cliArgsPrefix: cfg.cliArgsPrefix ?? [],
      maxConcurrency: cfg.maxConcurrency ?? 2,
      retry: cfg.retry ?? { attempts: 2, backoffMs: 750 },
    };
  }

  async runSweep(target: string): Promise<SynintSweepResult> {
    const { attempts, backoffMs } = this.cfg.retry;
    let lastError: unknown;

    for (let i = 0; i <= attempts; i += 1) {
      try {
        if (this.cfg.mode === 'http') {
          return await this.runSweepHttp(target);
        }
        return await this.runSweepCli(target);
      } catch (error) {
        lastError = error;
        if (i < attempts) {
          await delay(backoffMs * Math.max(1, i + 1));
        }
      }
    }

    throw lastError;
  }

  private async runSweepHttp(target: string): Promise<SynintSweepResult> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/sweep`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.httpTimeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`SYNINT HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = (await res.json()) as SynintSweepResult;
      return this.validateSweepResult(data, target);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async runSweepCli(target: string): Promise<SynintSweepResult> {
    const args = [
      ...this.cfg.cliArgsPrefix,
      this.cfg.cliEntrypoint,
      '--target',
      target,
      '--json',
    ];

    const child = spawn(this.cfg.pythonBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (data) => stdout.push(Buffer.from(data)));
    child.stderr.on('data', (data) => stderr.push(Buffer.from(data)));

    const exitCode = await new Promise<number>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });

    const output = Buffer.concat(stdout).toString('utf8').trim();
    const errorText = Buffer.concat(stderr).toString('utf8').trim();

    if (exitCode !== 0) {
      throw new Error(`SYNINT CLI exit ${exitCode}: ${errorText.slice(0, 600)}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error(
        `SYNINT CLI returned non-JSON. stderr=${errorText.slice(0, 300)} stdout=${output.slice(0, 300)}`,
      );
    }

    return this.validateSweepResult(parsed as SynintSweepResult, target);
  }

  private validateSweepResult(
    data: SynintSweepResult,
    target: string,
  ): SynintSweepResult {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid SYNINT result: not an object');
    }

    if (!data.target) {
      data.target = target;
    }
    if (!data.startedAt) {
      data.startedAt = new Date().toISOString();
    }
    if (!data.completedAt) {
      data.completedAt = new Date().toISOString();
    }
    if (!Array.isArray(data.agents)) {
      data.agents = [];
    }

    return data;
  }
}
