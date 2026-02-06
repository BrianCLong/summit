// Deterministic digest for graph entities projection.
// Requires APOC core procedures.
CALL {
  MATCH (e:Entity)
  WITH
    coalesce(toString(e.id), '') AS id,
    coalesce(toString(e.name), '') AS name,
    coalesce(toString(e.kind), '') AS kind,
    coalesce(toString(e.updated_at), '') AS updated_at
  RETURN apoc.util.sha256(apoc.text.join([id, name, kind, updated_at], '␟')) AS node_hex
}
WITH apoc.coll.sort(collect(node_hex)) AS sorted
RETURN apoc.util.sha256(apoc.text.join(sorted, '␞')) AS run_digest;
