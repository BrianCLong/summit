"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertStixBundle = upsertStixBundle;
const neo4j_js_1 = require("../../graph/neo4j.js");
async function upsertStixBundle(objs, source) {
    // 1) Upsert domain objects
    for (const o of objs) {
        if (o.type === 'indicator') {
            await (0, neo4j_js_1.runCypher)(`
        MERGE (e:Entity {stixId:$id})
        ON CREATE SET e.name=$name, e.types=['Indicator'], e.createdAt=$created, e.source=$source
        ON MATCH  SET e.modifiedAt=$modified, e.source=$source
        SET e.pattern=$pattern
      `, {
                id: o.id,
                name: o.name ?? o.pattern ?? o.id,
                pattern: o.pattern ?? '',
                created: o.created ?? '',
                modified: o.modified ?? '',
                source,
            });
        }
        else if (o.type === 'malware' ||
            o.type === 'campaign' ||
            o.type === 'threat-actor') {
            await (0, neo4j_js_1.runCypher)(`
        MERGE (e:Entity {stixId:$id})
        ON CREATE SET e.name=$name, e.types=[$type], e.createdAt=$created, e.source=$source
        ON MATCH  SET e.modifiedAt=$modified, e.source=$source
        SET e.description=$desc
      `, {
                id: o.id,
                name: o.name ?? o.id,
                type: o.type.replace('-', ' '),
                created: o.created ?? '',
                modified: o.modified ?? '',
                desc: o.description ?? '',
                source,
            });
        }
    }
    // 2) Upsert relationships
    for (const o of objs) {
        if (o.type === 'relationship' && o.source_ref && o.target_ref) {
            await (0, neo4j_js_1.runCypher)(`
        MATCH (a:Entity {stixId:$src}), (b:Entity {stixId:$tgt})
        MERGE (a)-[r:RELATED_TO {kind:$kind, source:$source}]->(b)
        ON CREATE SET r.createdAt=$created
        ON MATCH  SET r.modifiedAt=$modified
      `, {
                src: o.source_ref,
                tgt: o.target_ref,
                kind: o.relationship_type ?? 'related-to',
                source,
                created: o.created ?? '',
                modified: o.modified ?? '',
            });
        }
    }
}
