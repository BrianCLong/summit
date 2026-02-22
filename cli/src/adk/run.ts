import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { hashBytes } from './hash.js';
import { readManifestFile, writeDeterministicJson } from './manifest.js';
import { manifestSchema } from './schema.js';
import { stableStringify } from './stable-json.js';

type ToolCall = {
  name: string;
  input?: Record<string, unknown>;
};

type Fixture = {
  name?: string;
  inputs?: Record<string, unknown>;
  tool_calls?: ToolCall[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'agent';
}

function resolveGitSha(): string {
  const envSha = process.env.GIT_SHA;
  if (envSha && envSha.length >= 7) {
    return envSha;
  }
  const result = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf-8' });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return 'unknown000000';
}

function resolveRepoRoot(): string {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return process.cwd();
}

export async function runAgent(
  agentPath: string,
  fixturePath: string,
): Promise<{ evidenceId: string; outputDir: string }> {
  const manifestPath = agentPath.endsWith('.yaml') || agentPath.endsWith('.yml') || agentPath.endsWith('.json')
    ? agentPath
    : path.join(agentPath, 'agent.yaml');

  const { raw: manifestRaw, data: manifestData } = await readManifestFile(manifestPath);
  const manifestParse = manifestSchema.safeParse(manifestData);
  if (!manifestParse.success) {
    throw new Error('Manifest validation failed. Run summit adk validate for details.');
  }

  const fixtureRaw = await fs.readFile(fixturePath, 'utf-8');
  const fixtureData = JSON.parse(fixtureRaw) as Fixture;
  const manifestDigest = hashBytes(Buffer.from(manifestRaw));
  const fixtureDigest = hashBytes(Buffer.from(fixtureRaw));

  const gitSha = resolveGitSha();
  const sha12 = gitSha.slice(0, 12);
  const agentSlug = slugify(manifestParse.data.name);
  const fixtureName = fixtureData.name || path.basename(fixturePath, path.extname(fixturePath));
  const fixtureSlug = slugify(fixtureName);
  const hashSeed = stableStringify({
    agent: manifestParse.data.name,
    fixture: fixtureName,
    manifest: manifestDigest,
    fixtureDigest,
  });
  const hash8 = hashBytes(hashSeed).slice(0, 8);
  const evidenceId = `EVI-${agentSlug}-${fixtureSlug}-${sha12}-${hash8}`;

  const outputDir = path.join(resolveRepoRoot(), 'artifacts', 'agent-runs', evidenceId);
  await fs.mkdir(outputDir, { recursive: true });

  const allowTools = new Set(manifestParse.data.policy?.allow_tools ?? []);
  const toolsUnsafeEnabled = process.env.S_ADK_UNSAFE_TOOLS === '1';
  const toolCalls = fixtureData.tool_calls ?? [];
  const toolEvents: Array<Record<string, unknown>> = [];
  let toolCallsAllowed = 0;
  let toolCallsBlocked = 0;

  toolCalls.forEach((call, index) => {
    const allowed = toolsUnsafeEnabled && allowTools.has(call.name);
    const eventBase = {
      type: 'tool_call',
      index,
      tool: call.name,
      allowed,
      input: call.input ?? {},
    };
    if (allowed) {
      toolCallsAllowed += 1;
      toolEvents.push({ ...eventBase, status: 'allowed' });
    } else {
      toolCallsBlocked += 1;
      toolEvents.push({ ...eventBase, status: 'denied' });
    }
  });

  const traceEvents = [
    {
      type: 'workflow_start',
      evidence_id: evidenceId,
      agent: manifestParse.data.name,
      fixture: fixtureName,
    },
    {
      type: 'fixture_loaded',
      inputs: fixtureData.inputs ?? {},
    },
    ...toolEvents,
    {
      type: 'workflow_end',
      status: toolCallsBlocked > 0 ? 'blocked' : 'ok',
    },
  ];

  const tracePath = path.join(outputDir, 'trace.jsonl');
  const traceBody = traceEvents.map((event) => stableStringify(event)).join('\n');
  await fs.writeFile(tracePath, `${traceBody}\n`, 'utf-8');

  const result = {
    evidence_id: evidenceId,
    agent: {
      name: manifestParse.data.name,
      manifest_path: manifestPath,
    },
    fixture: {
      name: fixtureName,
      path: fixturePath,
      digest_sha256: fixtureDigest,
    },
    outcome: toolCallsBlocked > 0 ? 'blocked' : 'ok',
    output: fixtureData.inputs ?? {},
  };
  const resultPath = path.join(outputDir, 'result.json');
  await writeDeterministicJson(resultPath, result);

  const metrics = {
    evidence_id: evidenceId,
    counters: {
      tool_calls_total: toolCalls.length,
      tool_calls_allowed: toolCallsAllowed,
      tool_calls_blocked: toolCallsBlocked,
    },
  };
  const metricsPath = path.join(outputDir, 'metrics.json');
  await writeDeterministicJson(metricsPath, metrics);

  const traceDigest = hashBytes(await fs.readFile(tracePath, 'utf-8'));
  const resultDigest = hashBytes(await fs.readFile(resultPath, 'utf-8'));
  const metricsDigest = hashBytes(await fs.readFile(metricsPath, 'utf-8'));
  const stamp = {
    evidence_id: evidenceId,
    git_sha: sha12,
    manifest_digest: manifestDigest,
    fixture_digest: fixtureDigest,
    trace_digest: traceDigest,
    result_digest: resultDigest,
    metrics_digest: metricsDigest,
  };
  const stampPath = path.join(outputDir, 'stamp.json');
  await writeDeterministicJson(stampPath, stamp);

  return { evidenceId, outputDir };
}
