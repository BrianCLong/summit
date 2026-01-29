// Summit GraphRAG - Multi-hop Retrieval Cypher Templates

/**
 * 1. Multi-hop Context Retrieval
 * Traverses from a seed entity up to 2 hops to find related evidence, controls, and narratives.
 */
MATCH (seed {id: $seedId})
OPTIONAL MATCH path = (seed)-[*1..2]-(related)
WHERE NOT related:SystemNode // Filter out internal system nodes
RETURN
    seed,
    collect(path) as paths,
    collect(distinct related) as relatedEntities;

/**
 * 2. Governance-Aware Retrieval
 * Finds evidence linked to specific control requirements.
 */
MATCH (control:Control {id: $controlId})
MATCH (control)-[:REQUIRES_EVIDENCE]->(evidence:Evidence)
OPTIONAL MATCH (evidence)-[:LINKED_TO]->(narrative:Narrative)
RETURN control, evidence, narrative;

/**
 * 3. Narrative Timeline Reconstruction
 * Retrieves events related to a narrative in chronological order.
 */
MATCH (n:Narrative {id: $narrativeId})
MATCH (n)-[:CONTAINS_EVENT]->(e:Event)
RETURN e
ORDER BY e.timestamp ASC;

/**
 * 4. Evidence ID Consistency Check
 * Finds all nodes missing an Evidence ID.
 */
MATCH (n)
WHERE n.evidence_id IS NULL AND labels(n)[0] IN ['Artifact', 'Evidence', 'Control', 'Narrative']
RETURN n.id, labels(n) as types;
