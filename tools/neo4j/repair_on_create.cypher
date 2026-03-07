// Idempotent MERGE with deterministic stats (APOC required)
CALL apoc.merge.nodeWithStats(
  $labels,                               // e.g., ['PERSON']
  {__pk__: $pk},                         // identity map
  apoc.map.merge($onCreateProps,{__pk__:$pk,__tombstone__:false,applied_lsn:$lsn}),
  apoc.map.merge($onMatchProps, {applied_lsn:$lsn})
)
YIELD node, statistics
RETURN statistics;
