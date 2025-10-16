# On‑Call Runbooks (Triage)

## 4.1 GraphQL/API 5xx Burst

**Symptoms:** sudden spike in 5xx, latency regressions.

- Check OTel traces for the top offender route.
- Compare image digest in cluster vs values (`kubectl get deploy -o yaml | grep image:`).
- Scale up 1× temporarily if CPU>80%.
- If caused by new release: rollback (see rollback-procedure.md).

**Evidence:** attach trace IDs, p95 graphs, deployment revision.

## 4.2 Ingest Backlog / Queue Lag

**Symptoms:** Kafka/stream lag, delayed updates.

- Inspect consumer group lag; scale consumers; verify Redis/DB health.
- Check new image limits/requests; throttle upstream if needed.
- If schema mismatch: pause ingestion, revert producer/consumer to previous digest.

## 4.3 Neo4j Health & Failover

- Run health probe; if leader flaps, cordon node and failover.
- Ensure APOC/GDS versions match app image expectations; if mismatch after deploy, rollback app first.

## 4.4 Provenance / Signature Failure

- Run `cosign verify` against running image reference. If unsigned: quarantine namespace via NetworkPolicy; rollback.

## Verify Digest in Cluster

```bash
kubectl get deploy -n <ns> -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[*].image}{"\n"}{end}'
```

## Quarantine NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine
  namespace: <ns>
spec:
  podSelector: {}
  policyTypes: [Egress, Ingress]
```
