# Docling Service Rollback Runbook

## Trigger Conditions

- Docling SLO burn rate breach (>0.5 for 30m)
- Error rate >0.1% sustained for 10 minutes
- Compliance policy simulation failing in CI

## Rollback Steps

1. Freeze promotions:
   ```bash
   kubectl argo rollouts pause docling-svc -n platform-ml
   ```
2. Roll back to previous stable revision:
   ```bash
   kubectl argo rollouts undo docling-svc -n platform-ml --to-revision=<REVISION>
   ```
   Use `kubectl argo rollouts history docling-svc -n platform-ml` to identify revisions.
3. Re-route traffic to active service:
   ```bash
   kubectl argo rollouts promote docling-svc -n platform-ml --skip-verify
   ```
4. Validate rollback:
   - `curl -s https://docling.platform/api/v1/parse --data '{"requestId":"smoke","tenantId":"canary","purpose":"investigation","retention":"short","contentType":"text/plain","bytes":"dGVzdA=="}'`
   - Verify metrics `docling_inference_total{status="error"}` trending down.
5. Notify stakeholders with impact report and open incident ticket if not already.

## Post-Rollback Actions

- Capture logs from `/var/log/docling-svc` and attach to incident.
- Run `npm run test -- docling:regression` against previous revision.
- Schedule postmortem within 48 hours.
