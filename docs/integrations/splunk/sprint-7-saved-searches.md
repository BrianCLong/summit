# Splunk Saved Searches (Sprint 7)

Example event:
```json
{
  "host": "intelgraph",
  "action": "export",
  "entity": "threat",
  "pii": false
}
```

Saved search:
```json
{
  "name": "intelgraph-threat-exports",
  "search": "index=intelgraph action=export | stats count by entity"
}
```
