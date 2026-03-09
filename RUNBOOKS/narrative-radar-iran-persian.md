# Iran Narrative Radar (Persian First)

## Incident: Source Outage / Blackout Fallback
If direct API access to Telegram or State TV sources fails, fall back to archival and proxy endpoints.

## Incident: Source Poisoning Response
If synthetic spam floods the corpus, ensure `provenance-required` ingestion is enforcing evidence weighting. Discard items without valid EIDs.

## Visual-Risk False Positive Review
Heuristics like `reuse_as_new` can misfire. Annotate the output with "heuristic not proof" and do not automate take-downs based solely on these flags.

## Sudden Spike Triage
Investigate sudden narrative spikes by examining cross-platform bridge accounts and reviewing raw evidence samples.
