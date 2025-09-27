# Splunk Saved Searches – Sprint 9

## Review Decisions
```
sourcetype=intelgraph reviewDecision
| stats count by decision band actor
```

## Merge/Revert Events
```
sourcetype=intelgraph entityResolution
| stats count by action band actor
```

Fields containing embeddings or detector hashes are omitted unless
`ENABLE_SENSITIVE_EXPORTS=true`.
