import * as latency from './checks/latency';
import * as auth from './checks/auth';
import * as sandbox from './checks/sandbox';
import * as schema from './checks/schema';
import * as provenance from './checks/provenance';
import * as transport from './checks/transport';
import * as jsonrpc from './checks/jsonrpc';
import * as jsonrpcPositive from './checks/jsonrpcPositive';
import * as discovery from './checks/discovery';
import type { RunnerOutput, CheckResult } from './types';

type Ctx = { endpoint: string; token?: string };

export async function runAll(endpoint: string, token?: string): Promise<RunnerOutput> {
  const ctx: Ctx = { endpoint, token };
  const checks = await Promise.all([
    latency.run(ctx),
    auth.run(ctx),
    sandbox.run(ctx),
    schema.run(ctx),
    provenance.run(ctx),
    transport.run(ctx),
    jsonrpc.run(ctx),
    jsonrpcPositive.run(ctx),
    discovery.run(ctx)
  ]) as CheckResult[];
  const passed = checks.filter((c) => c.pass).length;
  return {
    summary: {
      passed,
      failed: checks.length - passed
    },
    checks
  };
}
