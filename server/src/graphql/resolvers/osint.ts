import type { GraphMutation, SynintSweepResult, SynintMode } from '../../services/osint-synint/types.js';
import { SynintClient } from '../../services/osint-synint/SynintClient.js';
import { SynintMapper } from '../../services/osint-synint/SynintMapper.js';
import { neo } from '../../db/neo4j.js';
import { getUser } from '../../auth/context.js';
import { policyEnforcer, type Purpose, type Action } from '../../policy/enforcer.js';
import client from 'prom-client';
import { register } from '../../monitoring/metrics.js';

const allowedLabels = new Set(['Domain', 'Organization', 'Target', 'Account', 'Event']);
const allowedEdgeTypes = new Set(['REGISTERED_TO', 'ASSOCIATED_WITH']);
const allowedEventTypes = new Set(['osint.sweep.completed']);

const synintSweepDurationMs = new client.Histogram({
  name: 'synint_sweep_duration_ms',
  help: 'SYNINT sweep resolver duration in ms',
  buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000],
});

const synintSweepErrorsTotal = new client.Counter({
  name: 'synint_sweep_errors_total',
  help: 'Total SYNINT sweep resolver errors',
});

const synintMutationsAppliedTotal = new client.Counter({
  name: 'synint_graph_mutations_applied_total',
  help: 'Total graph mutations applied from SYNINT sweeps',
  labelNames: ['kind'],
});

register.registerMetric(synintSweepDurationMs);
register.registerMetric(synintSweepErrorsTotal);
register.registerMetric(synintMutationsAppliedTotal);

function validateTargetOrThrow(target: string) {
  const trimmed = target.trim();
  if (trimmed.length < 3 || trimmed.length > 255) {
    throw new Error('Invalid target length');
  }

  const isDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed);
  const isIPv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(trimmed);
  const isHandle = /^[a-zA-Z0-9_@.-]{3,64}$/.test(trimmed);

  if (!isDomain && !isIPv4 && !isHandle) {
    throw new Error('Target format not allowed');
  }
}

function requireAllowedLabel(label: string): string {
  if (!allowedLabels.has(label)) {
    throw new Error(`Unsupported label: ${label}`);
  }
  return label;
}

function requireAllowedEdgeType(edgeType: string): string {
  if (!allowedEdgeTypes.has(edgeType)) {
    throw new Error(`Unsupported edge type: ${edgeType}`);
  }
  return edgeType;
}

async function applyGraphMutations(
  mutations: GraphMutation[],
  tenantId: string,
): Promise<void> {
  for (const mutation of mutations) {
    if (mutation.kind === 'upsertNode') {
      const labels = mutation.node.labels.map(requireAllowedLabel);
      const labelSegment = labels.map((label) => `:${label}`).join('');
      await neo.run(
        `MERGE (n${labelSegment} {id: $id, tenantId: $tenantId})\n         SET n += $props`,
        {
          id: mutation.node.id,
          tenantId,
          props: { ...mutation.node.props, tenantId },
        },
      );
    }

    if (mutation.kind === 'upsertEdge') {
      const edgeType = requireAllowedEdgeType(mutation.edge.type);
      await neo.run(
        `MATCH (from {id: $from, tenantId: $tenantId})\n         MATCH (to {id: $to, tenantId: $tenantId})\n         MERGE (from)-[r:${edgeType} {id: $id, tenantId: $tenantId}]->(to)\n         SET r += $props`,
        {
          id: mutation.edge.id,
          from: mutation.edge.from,
          to: mutation.edge.to,
          tenantId,
          props: { ...(mutation.edge.props ?? {}), tenantId },
        },
      );
    }

    if (mutation.kind === 'emitEvent') {
      if (!allowedEventTypes.has(mutation.event.type)) {
        throw new Error(`Unsupported event type: ${mutation.event.type}`);
      }
      const eventId = `event:${mutation.event.type}:${mutation.event.target}:${mutation.event.at}`;
      await neo.run(
        `MERGE (e:Event {id: $id, tenantId: $tenantId})\n         SET e += $props`,
        {
          id: eventId,
          tenantId,
          props: {
            type: mutation.event.type,
            at: mutation.event.at,
            actor: mutation.event.actor ?? null,
            target: mutation.event.target,
            payload: mutation.event.payload,
            tenantId,
          },
        },
      );
    }
  }
}

export const runSynintSweep = async (
  _: unknown,
  args: { target: string },
  ctx: { purpose?: Purpose; req?: { ip?: string; get?: (name: string) => string | undefined } },
): Promise<SynintSweepResult> => {
  validateTargetOrThrow(args.target);
  const start = Date.now();

  try {
    const user = getUser(ctx);
    const purpose: Purpose = ctx.purpose ?? 'investigation';
    const decision = await policyEnforcer.requirePurpose('investigation', {
      tenantId: user.tenant,
      userId: user.id,
      action: 'ingest' as Action,
      resource: 'osint_sweep',
      purpose,
      clientIP: ctx.req?.ip,
      userAgent: ctx.req?.get?.('user-agent'),
    });

    if (!decision.allow) {
      throw new Error(`Access denied: ${decision.reason ?? 'policy denied'}`);
    }

    const mode: SynintMode = process.env.SYNINT_MODE === 'cli' ? 'cli' : 'http';
    const client = new SynintClient({
      mode,
      baseUrl: process.env.SYNINT_URL,
      pythonBin: process.env.SYNINT_PYTHON ?? 'python3',
      cliEntrypoint: process.env.SYNINT_ENTRYPOINT ?? 'main.py',
      httpTimeoutMs: Number(process.env.SYNINT_TIMEOUT_MS ?? '120000'),
      maxConcurrency: Number(process.env.SYNINT_CONCURRENCY ?? '2'),
    });

    const sweep = await client.runSweep(args.target);
    const mapper = new SynintMapper({ sourceTag: 'synint' });
    const mutations = mapper.toMutations(sweep);

    await applyGraphMutations(mutations, user.tenant);
    for (const mutation of mutations) {
      synintMutationsAppliedTotal.inc({ kind: mutation.kind });
    }

    return sweep;
  } catch (error) {
    synintSweepErrorsTotal.inc();
    throw error;
  } finally {
    synintSweepDurationMs.observe(Date.now() - start);
  }
};

export const osintResolvers = {
  Mutation: {
    runSynintSweep,
  },
};
