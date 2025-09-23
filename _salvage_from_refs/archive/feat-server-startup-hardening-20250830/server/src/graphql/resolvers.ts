import { runCypher } from "../graph/neo4j";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const resolvers = {
  Query: {
    suggestions: async (_: any, { status = "pending", limit = 50 }: any) => {
      const rows = await runCypher(`
        MATCH (s:AISuggestion {status: $status})
        RETURN s { .id, .type, .label, .confidence, .status, .createdAt } AS s
        ORDER BY s.createdAt DESC
        LIMIT $limit
      `, { status, limit });
      return rows.map((r: any) => r.s);
    },
    citations: async (_:any,{id}:any)=> {
      const rows = await runCypher(`
        MATCH (a:Answer {id:$id})- [c:CITED] -> (n)
        RETURN labels(n) AS labels, n.id AS id, coalesce(n.name, n.source) AS name, c.kind AS kind
      `,{id});
      return rows.map((r:any)=>({kind:r.kind, id:r.id, name:r.name}));
    },
    caseAnswers: async (_: any, { caseId }: any) => {
      const rows = await runCypher(`
        MATCH (c:Case {id: $caseId})-[:CONTAINS]->(a:Answer)
        RETURN a { .id, .content, .createdAt } AS a
        ORDER BY a.createdAt DESC
      `, { caseId });
      return rows.map((r: any) => r.a);
    },
    tenantConfig: async (_: any, { id }: any, ctx: any) => {
      if (!ctx.user?.scopes?.includes("platform:admin")) throw new Error("forbidden");
      const res = await pool.query("SELECT * FROM tenant_config WHERE id = $1", [id]);
      return res.rows[0] || { id, rag: false, erV2: false, transport: "fetch", rpmLimit: 60, modelTier: "standard" };
    },
    case: async (_: any, { id }: any) => {
      const rows = await runCypher(`
        MATCH (c:Case {id: $id})
        RETURN c { .id, .name, .createdAt, .updatedAt } AS c
      `, { id });
      return rows[0]?.c;
    },
    cases: async () => {
      const rows = await runCypher(`
        MATCH (c:Case)
        RETURN c { .id, .name, .createdAt, .updatedAt } AS c
        ORDER BY c.createdAt DESC
      `);
      return rows.map((r: any) => r.c);
    }
  },
  Mutation: {
    createCase: async (_: any, { name }: any, ctx: any) => {
      if (!ctx.user?.scopes?.includes("case:write")) throw new Error("forbidden");
      const rows = await runCypher(`
        CREATE (c:Case {id: apoc.create.uuid(), name: $name, createdAt: timestamp(), updatedAt: timestamp()})
        RETURN c { .id, .name, .createdAt, .updatedAt } AS c
      `, { name });
      return rows[0]?.c;
    },
    updateCase: async (_: any, { id, name }: any, ctx: any) => {
      if (!ctx.user?.scopes?.includes("case:write")) throw new Error("forbidden");
      const rows = await runCypher(`
        MATCH (c:Case {id: $id})
        SET c.name = $name, c.updatedAt = timestamp()
        RETURN c { .id, .name, .createdAt, .updatedAt } AS c
      `, { id, name });
      return rows[0]?.c;
    },
    deleteCase: async (_: any, { id }: any, ctx: any) => {
      if (!ctx.user?.scopes?.includes("case:write")) throw new Error("forbidden");
      const rows = await runCypher(`
        MATCH (c:Case {id: $id})
        DETACH DELETE c
        RETURN 1 AS ok
      `, { id });
      return rows.length > 0;
    },
    attachAnswerToCase: async (_: any, { caseId, answerId, sig }: any, ctx: any) => {
      if (!ctx.user?.scopes?.includes("case:write")) throw new Error("forbidden");
      const userId = ctx.user?.id; // Assuming user ID is available in context
      if (!userId) throw new Error("unauthorized: user ID not found in context");

      const rows = await runCypher(`
        MATCH (c:Case {id:$caseId}), (u:User {id:$userId}), (a:Answer {id:$answerId})
        MERGE (c)-[:CONTAINS]->(a)
        MERGE (u)-[:COLLECTED {at:timestamp(), sig:$sig}]->(a)
        RETURN 1 AS ok
      `, { caseId, userId, answerId, sig });
      return rows.length > 0;
    },
    acceptSuggestion: async (_: any, { id }: any, ctx: any) => {
      // RBAC
      if (!ctx.user?.scopes?.includes("graph:write")) throw new Error("forbidden");

      const rows = await runCypher(`
        MATCH (s:AISuggestion {id: $id}) WHERE s.status='pending'
        WITH s, split(s.label, ":") AS parts
        WITH s, parts[0] AS etype, apoc.text.join(parts[1..], ":") AS name
        // Materialize entity; map simple types
        MERGE (e:Entity {name: name})
        ON CREATE SET e.createdAt = timestamp(), e.types = [etype]
        ON MATCH SET e.types = apoc.coll.toSet(coalesce(e.types, []) + etype)
        SET s.status='accepted'
        MERGE (s)-[:MATERIALIZED]->(e)
        RETURN 1 AS ok
      `, { id });
      return rows.length > 0;
    },
    rejectSuggestion: async (_: any, { id }: any, ctx: any) => {
      if (!ctx.user?.scopes?.includes("graph:write")) throw new Error("forbidden");
      const rows = await runCypher(`
        MATCH (s:AISuggestion {id: $id}) WHERE s.status='pending'
        SET s.status='rejected'
        RETURN 1 AS ok
      `, { id });
      return rows.length > 0;
    },
    upsertTenantConfig: async (_: any, args: any, ctx: any) => {
      if (!ctx.user?.scopes?.includes("platform:admin")) throw new Error("forbidden");
      const { id, rag, erV2, transport, rpmLimit, modelTier } = args;
      const res = await pool.query(`
        INSERT INTO tenant_config (id, rag, er_v2, transport, rpm_limit, model_tier)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          rag = $2, er_v2 = $3, transport = $4, rpm_limit = $5, model_tier = $6
        RETURNING *
      `, [id, rag, erV2, transport, rpmLimit, modelTier]);
      return res.rows[0];
    }
  },
};
