// MERGE identity; only apply when incoming LSN is newer
MERGE (n:Label {pk: $pk})
ON CREATE SET n += $props, n.__last_applied_lsn = $lsn
ON MATCH
  SET n += CASE WHEN $lsn > coalesce(n.__last_applied_lsn, 0) THEN $props ELSE {} END,
      n.__last_applied_lsn = CASE WHEN $lsn > coalesce(n.__last_applied_lsn, 0) THEN $lsn ELSE n.__last_applied_lsn END
RETURN n.pk AS pk, n.__last_applied_lsn AS last_applied_lsn;
