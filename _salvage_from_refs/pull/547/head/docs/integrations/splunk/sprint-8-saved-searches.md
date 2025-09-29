# Splunk Saved Searches (Sprint 8)

- **Quarantined Uploads**
  ```spl
  index=intelgraph sourcetype=media_upload quarantined=true
  ```
- **GraphRAG Timeouts**
  ```spl
  index=intelgraph metric_name=graphrag_timeouts_total
  ```
