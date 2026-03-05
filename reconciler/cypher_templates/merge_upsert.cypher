// Param contract:
// $pk : stable primary-key digest (string)
// $props : map of user properties (no __last_applied_lsn inside)
// $lsn : integer (monotonic log sequence number)
//
// Semantics:
// - First write wins create; later writes only apply if lsn is greater.
// - On MATCH, we only apply props if new lsn is newer; otherwise it's a noop.
// - __last_applied_lsn is always the max seen (monotonic).

MERGE (n:Entity {pk_digest: $pk})
ON CREATE
  SET n += $props,
      n.__last_applied_lsn = $lsn
ON MATCH
  SET n += CASE
             WHEN $lsn > coalesce(n.__last_applied_lsn, 0)
             THEN $props
             ELSE {}
           END,
      n.__last_applied_lsn = CASE WHEN $lsn > coalesce(n.__last_applied_lsn, 0) THEN $lsn ELSE coalesce(n.__last_applied_lsn, 0) END
RETURN n.pk_digest AS pk, n.__last_applied_lsn AS last_lsn
