# Data Model

## Core Types

- **Entity(id, type, props, confidence, createdAt, updatedAt)**
- **Relationship(src, dst, kind, start, end, confidence, props, source, evidenceRef)**
- **Provenance(source, collector, fetchedAt, hash, signature?)**
- **PolicyLabel(name, rules)** (ABAC)

## Conventions

- Time in ISO‑8601; open intervals allowed (only `start` or `end`).
- Confidence in [0,1]; default 0.5; derived edges lower of parents unless specified.
- Evidence blobs stored in object storage; `evidenceRef` points to bucket/key and content hash.

## Example Cypher

```cypher
MERGE (e:Entity {id:$id}) SET e.type=$type, e += $props, e.confidence=coalesce($confidence,0.5)
WITH e
UNWIND $rels AS r
  MERGE (dst:Entity {id:r.dst}) SET dst.type=r.type
  MERGE (e)-[rel:REL {kind:r.kind}]->(dst)
  SET rel.start=r.start, rel.end=r.end, rel.confidence=r.confidence, rel += r.props
```
