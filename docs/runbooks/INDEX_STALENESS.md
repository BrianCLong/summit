# Index Staleness Runbook

**Trigger:**
* `IndexFreshnessLag` alert (> 5 min lag)
* `IndexFreshness` dashboard red.

**Impact:**
* Search results return outdated information.
* "GA-Context Graph" coverage drops.

**Immediate Actions:**
1. **Check Indexer Job:**
   * Is `elasticsearch-indexer` running?
   * Check logs for mapping errors.
2. **Flip Freshness Override:**
   * Force queries to go to primary DB if critical: `summitctl flags set search_freshness_override true`
3. **Prioritize Official Sources:**
   * Ensure "Official" sources are prioritized in the queue.
4. **Backfill Job:**
   * Trigger manual backfill for affected time window: `summitctl jobs trigger backfill --since=1h`

**Escalation:**
* Page Data Engineer if lag > 30 mins.
