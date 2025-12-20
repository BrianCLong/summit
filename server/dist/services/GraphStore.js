import { getNeo4jDriver } from '../db/neo4j';
function nodeToEntity(node) {
    const props = node.properties;
    return {
        id: props.id,
        type: props.type,
        value: props.value,
        label: props.label,
    };
}
function relToRelationship(rel) {
    const props = rel.properties;
    return {
        id: props.id,
        fromId: props.fromId,
        toId: props.toId,
        type: props.type,
        since: props.since,
        until: props.until,
    };
}
export function createGraphStore(driver = getNeo4jDriver()) {
    return {
        async getEntities(filters = {}) {
            const session = driver.session();
            const { type = null, q = null, limit = 25 } = filters;
            try {
                if (q) {
                    const res = await session.run(`CALL db.index.fulltext.queryNodes('entity_fulltext', $q) YIELD node WHERE $type IS NULL OR node.type = $type RETURN node LIMIT $limit`, { q, type, limit });
                    return res.records.map((r) => nodeToEntity(r.get('node')));
                }
                const res = await session.run(`MATCH (e:Entity) WHERE $type IS NULL OR e.type = $type RETURN e LIMIT $limit`, { type, limit });
                return res.records.map((r) => nodeToEntity(r.get('e')));
            }
            finally {
                await session.close();
            }
        },
        async getRelationships(entityId) {
            const session = driver.session();
            try {
                const res = await session.run(`MATCH (:Entity {id: $id})-[r:RELATIONSHIP]-(:Entity) RETURN r`, { id: entityId });
                return res.records.map((r) => relToRelationship(r.get('r')));
            }
            finally {
                await session.close();
            }
        },
        async upsertEntity(e) {
            const session = driver.session();
            try {
                const res = await session.writeTransaction((tx) => tx.run(`MERGE (n:Entity {id: $id})
             ON CREATE SET n.type=$type, n.value=$value, n.label=$label, n.createdAt=timestamp()
             ON MATCH SET n.type=$type, n.value=$value, n.label=$label, n.updatedAt=timestamp()
             RETURN n`, e));
                return nodeToEntity(res.records[0].get('n'));
            }
            finally {
                await session.close();
            }
        },
        async upsertRelationship(r) {
            const session = driver.session();
            try {
                const res = await session.writeTransaction((tx) => tx.run(`MATCH (a:Entity {id: $fromId}), (b:Entity {id: $toId})
             MERGE (a)-[rel:RELATIONSHIP {id: $id}]->(b)
             ON CREATE SET rel.type=$type, rel.fromId=$fromId, rel.toId=$toId, rel.since=$since, rel.until=$until, rel.createdAt=timestamp()
             ON MATCH SET rel.type=$type, rel.since=$since, rel.until=$until, rel.updatedAt=timestamp()
             RETURN rel`, r));
                return relToRelationship(res.records[0].get('rel'));
            }
            finally {
                await session.close();
            }
        },
        async deleteEntity(id) {
            const session = driver.session();
            try {
                await session.writeTransaction((tx) => tx.run(`MATCH (n:Entity {id: $id}) DETACH DELETE n`, { id }));
            }
            finally {
                await session.close();
            }
        },
        async deleteRelationship(id) {
            const session = driver.session();
            try {
                await session.writeTransaction((tx) => tx.run(`MATCH ()-[r:RELATIONSHIP {id: $id}]-() DELETE r`, { id }));
            }
            finally {
                await session.close();
            }
        },
    };
}
//# sourceMappingURL=GraphStore.js.map