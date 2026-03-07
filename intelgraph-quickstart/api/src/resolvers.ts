import { getSession } from "./db/neo4j";
import { allow } from "./abac";
export const resolvers = {
  Query: {
    async personById(_: any, { id }: any, ctx: any) {
      if (
        !(await allow({ tenantId: ctx.tenantId }, "read", {
          type: "person",
          id,
        }))
      ) {
        throw new Error("forbidden");
      }
      const s = getSession();
      const res = await s.run("MATCH (p:Person {id:$id, tenant_id:$tid}) RETURN p", {
        id,
        tid: ctx.tenantId,
      });
      await s.close();
      return res.records[0]?.get("p").properties || null;
    },
    async searchPersons(_: any, { q, limit }: any, ctx: any) {
      const s = getSession();
      const res = await s.run(
        "MATCH (p:Person) WHERE p.tenant_id=$tid AND toLower(p.name) CONTAINS toLower($q) RETURN p LIMIT $limit",
        { tid: ctx.tenantId, q, limit }
      );
      await s.close();
      return res.records.map((r) => r.get("p").properties);
    },
    async neighbors(_: any, { personId, limit }: any, ctx: any) {
      const s = getSession();
      const res = await s.run(
        "MATCH (p:Person {id:$id, tenant_id:$tid})-[]-(n:Person {tenant_id:$tid}) RETURN n LIMIT $limit",
        { id: personId, tid: ctx.tenantId, limit }
      );
      await s.close();
      return res.records.map((r) => r.get("n").properties);
    },
  },
};
