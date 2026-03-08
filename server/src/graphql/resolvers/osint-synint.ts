import { SynintClient } from "../../services/osint-synint/SynintClient.js";
import { SynintMapper } from "../../services/osint-synint/SynintMapper.js";
import { GraphMutation, SynintSweepResult } from "../../services/osint-synint/types.js";
import { getNeo4jDriver } from "../../db/neo4j.js";

async function applyGraphMutations(mutations: GraphMutation[]) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    for (const m of mutations) {
      if (m.kind === "upsertNode") {
        // Construct label string safely
        const labels = m.node.labels
          .map(l => l.replace(/[^a-zA-Z0-9_]/g, ""))
          .filter(l => l.length > 0)
          .join(":");

        // Ensure at least one label or fallback to Entity
        const labelStr = labels.length > 0 ? labels : "Entity";

        const q = `MERGE (n:${labelStr} {id: $id}) SET n += $props`;
        await session.run(q, { id: m.node.id, props: m.node.props });

      } else if (m.kind === "upsertEdge") {
        const type = m.edge.type.replace(/[^a-zA-Z0-9_]/g, "");
        if (!type) continue;

        const q = `
          MATCH (a {id: $from}), (b {id: $to})
          MERGE (a)-[r:${type}]->(b)
          SET r += $props
        `;
        await session.run(q, { from: m.edge.from, to: m.edge.to, props: m.edge.props || {} });

      } else if (m.kind === "emitEvent") {
        console.log("Synint Event:", JSON.stringify(m.event));
      }
    }
  } catch (error) {
    console.error("Error applying Synint mutations:", error);
    throw error;
  } finally {
    await session.close();
  }
}

function validateTargetOrThrow(target: string) {
  const t = target.trim();
  if (t.length < 3 || t.length > 255) throw new Error("Invalid target length");

  const isDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t);
  const isIPv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(t);
  const isHandle = /^[a-zA-Z0-9_@.-]{3,64}$/.test(t);

  if (!isDomain && !isIPv4 && !isHandle) throw new Error("Target format not allowed");
}

export const osintSynintResolvers = {
  Mutation: {
    runSynintSweep: async (_: unknown, args: { target: string }, ctx: any): Promise<SynintSweepResult> => {
      validateTargetOrThrow(args.target);

      const client = new SynintClient({
        mode: (process.env.SYNINT_MODE as any) ?? "http",
        baseUrl: process.env.SYNINT_URL,
        pythonBin: process.env.SYNINT_PYTHON ?? "python3",
        cliEntrypoint: process.env.SYNINT_ENTRYPOINT ?? "main.py",
        httpTimeoutMs: Number(process.env.SYNINT_TIMEOUT_MS ?? "120000"),
        maxConcurrency: Number(process.env.SYNINT_CONCURRENCY ?? "2"),
      });

      const sweep = await client.runSweep(args.target);

      const mapper = new SynintMapper({ sourceTag: "synint" });
      const mutations = mapper.toMutations(sweep);

      await applyGraphMutations(mutations);

      return sweep;
    },
  },
};
