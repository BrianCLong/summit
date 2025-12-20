const q = [];
let t = null;
export function enqueue(task, maxDelayMs = 20, maxBatch = 200) {
    q.push(task);
    if (!t)
        t = setTimeout(flush, maxDelayMs);
    if (q.length >= maxBatch)
        flush();
}
async function flush() {
    const batch = q.splice(0, q.length);
    t && clearTimeout(t);
    t = null;
    const audits = batch.filter((b) => b.type === 'audit').map((b) => b.payload);
    const cites = batch.filter((b) => b.type === 'cite').map((b) => b.payload);
    // write in groups (PG COPY / Neo4j UNWIND)
    if (audits.length)
        await writeAudits(audits);
    if (cites.length)
        await writeCites(cites);
}
import { runCypher } from '../graph/neo4j'; // Import runCypher
// Placeholder functions for now
async function writeAudits(audits) {
    console.log('Writing audits:', audits.length);
    // Implement actual audit writing logic here
    // For now, let's just log them
    // In a real scenario, this would be a batch write to a database or logging system
    const answerCreations = audits.filter((a) => a.type === 'answer_creation');
    if (answerCreations.length > 0) {
        for (const ac of answerCreations) {
            await runCypher(`
        MERGE (u:User {id:$userId})
        MERGE (r:Request {id:$reqId})
        MERGE (a:Answer {id:$answerId})
          ON CREATE SET a.createdAt:timestamp(), a.mode:$mode, a.tokens:$tokens, a.experiment:$exp
        MERGE (u)-[:MADE_REQUEST]->(r)
        MERGE (r)-[:PRODUCED]->(a)
      `, {
                userId: ac.userId,
                reqId: ac.reqId,
                answerId: ac.answerId,
                mode: ac.mode,
                tokens: ac.tokens,
                exp: ac.exp,
            });
        }
    }
}
async function writeCites(cites) {
    console.log('Writing cites:', cites.length);
    // Implement actual cite writing logic here
    // Example: UNWIND for CITED relationships
    if (cites.length === 0)
        return;
    const entityCites = cites.filter((c) => c.kind === 'entity');
    const documentCites = cites.filter((c) => c.kind === 'document');
    if (entityCites.length > 0) {
        await runCypher(`
      UNWIND $rows AS r
      MATCH (a:Answer {id:r.answerId}), (e:Entity {id:r.id})
      MERGE (a)-[:CITED {kind:'entity'}]->(e)
    `, { rows: entityCites.map((c) => ({ answerId: c.answerId, id: c.id })) });
    }
    if (documentCites.length > 0) {
        await runCypher(`
      UNWIND $rows AS r
      MERGE (d:Document {source:r.id}) // Assuming 'id' for document cites is 'source'
      MATCH (a:Answer {id:r.answerId})
      MERGE (a)-[:CITED {kind:'document'}]->(d)
    `, { rows: documentCites.map((c) => ({ answerId: c.answerId, id: c.id })) });
    }
}
//# sourceMappingURL=coalescer.js.map