// server/src/graphql/resolvers.osint.ts

import { SynintClient } from "../services/osint-synint/SynintClient.js";
import { SynintMapper } from "../services/osint-synint/SynintMapper.js";
import type { SynintSweepResult, GraphMutation } from "../services/osint-synint/types.js";
import { Neo4jGraphService } from "../services/GraphService.js";

function validateTargetOrThrow(target: string) {
  const t = target.trim();
  if (t.length < 3 || t.length > 255) throw new Error("Invalid target length");

  const isDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t);
  const isIPv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(t);
  const isHandle = /^[a-zA-Z0-9_@.-]{3,64}$/.test(t);

  if (!isDomain && !isIPv4 && !isHandle) throw new Error("Target format not allowed");
}

async function applyMutations(tenantId: string, mutations: GraphMutation[]) {
  const graphService = Neo4jGraphService.getInstance();
  for (const mut of mutations) {
    if (mut.kind === "upsertNode") {
      await graphService.upsertEntity(tenantId, {
        id: mut.node.id,
        type: mut.node.labels[0] || "Unknown",
        label: (mut.node.props.name || mut.node.props.domain || mut.node.props.key || mut.node.id) as string,
        attributes: mut.node.props,
      });
    } else if (mut.kind === "upsertEdge") {
      await graphService.upsertEdge(tenantId, {
        id: mut.edge.id,
        fromEntityId: mut.edge.from,
        toEntityId: mut.edge.to,
        type: mut.edge.type,
        attributes: mut.edge.props,
      });
    }
  }
}

export const osintResolvers = {
  Mutation: {
    runSynintSweep: async (_: any, { target }: { target: string }, ctx: any): Promise<SynintSweepResult> => {
      validateTargetOrThrow(target);

      const client = new SynintClient({
        mode: (process.env.SYNINT_MODE as any) ?? "http",
        baseUrl: process.env.SYNINT_URL,
        pythonBin: process.env.SYNINT_PYTHON ?? "python3",
        cliEntrypoint: process.env.SYNINT_ENTRYPOINT ?? "main.py",
        httpTimeoutMs: Number(process.env.SYNINT_TIMEOUT_MS ?? "120000"),
        maxConcurrency: Number(process.env.SYNINT_CONCURRENCY ?? "2"),
      });

      const sweep = await client.runSweep(target);

      const mapper = new SynintMapper({ sourceTag: "synint" });
      const mutations = mapper.toMutations(sweep);

      const tenantId = ctx.user?.tenantId || "default";
      await applyMutations(tenantId, mutations);

      if (ctx.auditLog) {
        ctx.auditLog("osint.sweep.completed", {
          target: sweep.target,
          agentCount: sweep.agents.length,
          successCount: sweep.agents.filter(a => a.success).length,
        });
      }

      return sweep;
    },
  },
};
