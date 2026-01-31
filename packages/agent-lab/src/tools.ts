import { promises as dns } from 'dns';
import fs from 'fs';
import path from 'path';
import { setTimeout as wait } from 'timers/promises';

import { ContentBoundary } from './contentBoundary.js';
import { PolicyDecision } from './policy.js';

export interface ToolContext {
  labMode: boolean;
  dryRun: boolean;
  boundary: ContentBoundary;
  evidenceRoot: string;
  policyDecision: PolicyDecision;
  timeoutMs: number;
}

export interface ToolExecution {
  output: unknown;
  notes?: string;
  stdout?: string;
  stderr?: string;
}

export interface ToolDefinition {
  name: string;
  version: string;
  description: string;
  execute(inputs: Record<string, unknown>, context: ToolContext): Promise<ToolExecution>;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    wait(timeoutMs).then(() => {
      throw new Error(`Timeout after ${timeoutMs}ms`);
    }),
  ]);
};

export const httpHeadTool: ToolDefinition = {
  name: 'http_head',
  version: '0.1.0',
  description: 'Performs a HEAD request (or GET fallback) to retrieve metadata only.',
  async execute(inputs, context) {
    const target = String(inputs.url || '');
    if (!target) {
      throw new Error('url is required');
    }

    if (context.dryRun || !context.labMode) {
      return {
        output: { url: target, status: 'dry-run', headers: {}, mock: true },
        notes: 'Dry-run mode; no network call performed.',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
    try {
      const res = await withTimeout(
        fetch(target, { method: 'HEAD', signal: controller.signal }).catch(() => fetch(target, { method: 'GET', signal: controller.signal })),
        context.timeoutMs,
      );
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      return {
        output: { url: target, status: res.status, headers },
        stdout: JSON.stringify(headers, null, 2),
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export const dnsLookupTool: ToolDefinition = {
  name: 'dns_lookup',
  version: '0.1.0',
  description: 'Resolves DNS records (A/AAAA/CNAME) for an allowlisted domain.',
  async execute(inputs, context) {
    const domain = String(inputs.domain || '');
    if (!domain) {
      throw new Error('domain is required');
    }

    if (context.dryRun || !context.labMode) {
      return {
        output: { domain, records: [], status: 'dry-run', mock: true },
        notes: 'Dry-run mode; resolver not invoked.',
      };
    }

    const records = await withTimeout(dns.lookup(domain, { all: true }), context.timeoutMs);
    return { output: { domain, records } };
  },
};

export const localGrepTool = (root: string): ToolDefinition => ({
  name: 'local_grep',
  version: '0.1.0',
  description: 'Searches for a safe string within the local artifacts folder only.',
  async execute(inputs) {
    const needle = String(inputs.pattern || '');
    if (!needle) {
      throw new Error('pattern is required');
    }

    const targetDir = path.resolve(root);
    if (!targetDir.includes(path.resolve('artifacts'))) {
      throw new Error('local_grep restricted to artifacts folder');
    }

    if (!fs.existsSync(targetDir)) {
      return { output: { matches: [], note: 'No artifacts directory present.' } };
    }

    const files = fs.readdirSync(targetDir);
    const matches: Array<{ file: string; count: number }> = [];

    for (const file of files) {
      const fullPath = path.join(targetDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) continue;
      const content = fs.readFileSync(fullPath, 'utf-8');
      const count = content.split(needle).length - 1;
      if (count > 0) {
        matches.push({ file, count });
      }
    }

    return { output: { matches } };
  },
});

export const builtInTools = (artifactRoot: string): ToolDefinition[] => [
  httpHeadTool,
  dnsLookupTool,
  localGrepTool(path.join(artifactRoot, 'raw')),
];
