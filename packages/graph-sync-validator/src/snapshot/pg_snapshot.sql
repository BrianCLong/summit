-- Ensure views exist
\i packages/graph-sync-validator/src/snapshot/pg_materialized_views.sql

-- Refresh the snapshot
SELECT refresh_canon_views();

-- Default OUT_DIR if not set
\if :{?OUT_DIR}
\else
  \set OUT_DIR 'artifacts/graph-sync'
\endif

-- Set filenames
\set nodes_file :OUT_DIR '/pg.nodes.jsonl'
\set edges_file :OUT_DIR '/pg.edges.jsonl'

-- Export to JSONL
-- We use row_to_json to get a single JSON object per line.
-- We verify correct ordering for determinism.
\copy (SELECT row_to_json(t) FROM (SELECT * FROM canon_nodes ORDER BY id) t) TO :'nodes_file';

\copy (SELECT row_to_json(t) FROM (SELECT * FROM canon_edges ORDER BY src, rel, dst) t) TO :'edges_file';
