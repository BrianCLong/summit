# Threat Model: Narrative Intelligence v1

## Assets
- **Narrative Skeletons**: Intellectual property (the analysis).
- **Graph Structure**: Attribution data.
- **Evidence Artifacts**: Audit trail.
- **Ingested Content**: Potentially sensitive or toxic.

## Threats (STRIDE)

### Spoofing
- **Threat**: Bad actor injects fake narratives to pollute the graph.
- **Mitigation**: Strict source allow-listing in `source-policy.md`. Signature verification on ingestion.

### Tampering
- **Threat**: Modification of evidence artifacts.
- **Mitigation**: Deterministic hashing (`stamp.json`). Write-once storage for evidence.

### Repudiation
- **Threat**: Operator denies running a detection.
- **Mitigation**: Audit logs for all API calls. Evidence ID logging.

### Information Disclosure
- **Threat**: Leaking sensitive PII from narratives.
- **Mitigation**: Redaction pipeline (deny-by-default). Tenant isolation (row-level security in DB).

### Denial of Service
- **Threat**: Complex narrative payloads causing OOM/CPU spikes.
- **Mitigation**: Input size limits. Timeout on extraction. Circuit breakers.

### Elevation of Privilege
- **Threat**: Using narrative analysis to bypass access controls.
- **Mitigation**: RBAC enforcement. Service-to-service auth (mTLS).
