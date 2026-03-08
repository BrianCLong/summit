"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const neo4j_1 = require("./db/neo4j");
const abac_1 = require("./abac");
exports.resolvers = {
    Query: {
        async personById(_, { id }, ctx) {
            if (!(await (0, abac_1.allow)({ tenantId: ctx.tenantId }, 'read', {
                type: 'person',
                id,
            }))) {
                throw new Error('forbidden');
            }
            const s = (0, neo4j_1.getSession)();
            const res = await s.run('MATCH (p:Person {id:$id, tenant_id:$tid}) RETURN p', { id, tid: ctx.tenantId });
            await s.close();
            return res.records[0]?.get('p').properties || null;
        },
        async searchPersons(_, { q, limit }, ctx) {
            const s = (0, neo4j_1.getSession)();
            const res = await s.run('MATCH (p:Person) WHERE p.tenant_id=$tid AND toLower(p.name) CONTAINS toLower($q) RETURN p LIMIT $limit', { tid: ctx.tenantId, q, limit });
            await s.close();
            return res.records.map((r) => r.get('p').properties);
        },
        async neighbors(_, { personId, limit }, ctx) {
            const s = (0, neo4j_1.getSession)();
            const res = await s.run('MATCH (p:Person {id:$id, tenant_id:$tid})-[]-(n:Person {tenant_id:$tid}) RETURN n LIMIT $limit', { id: personId, tid: ctx.tenantId, limit });
            await s.close();
            return res.records.map((r) => r.get('n').properties);
        },
    },
};
