# Air-Gapped Registry Operational Runbook

## Table of Contents

1. [Overview](#overview)
2. [Daily Operations](#daily-operations)
3. [Weekly Operations](#weekly-operations)
4. [Image Sync Procedures](#image-sync-procedures)
5. [Incident Response](#incident-response)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Disaster Recovery](#disaster-recovery)

---

## Overview

This runbook covers operational procedures for the IntelGraph air-gapped container registry infrastructure.

### Key Components

| Component | Purpose | Health Check |
|-----------|---------|--------------|
| Harbor Core | API and business logic | `curl /api/v2.0/ping` |
| Harbor Registry | Image storage | `curl :5000/` |
| Trivy | Vulnerability scanning | `curl :8080/probe/healthy` |
| PostgreSQL | Metadata storage | `pg_isready` |
| Redis | Caching | `redis-cli ping` |

### Contact Information

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call Engineer | #platform-oncall | PagerDuty |
| Security Team | security@intelgraph.local | Immediate |
| Platform Lead | platform-lead@intelgraph.local | 30 min |

---

## Daily Operations

### Morning Health Check (08:00)

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Harbor Health Check ==="

# 1. Check Harbor API
echo "Checking Harbor API..."
curl -sf https://registry.intelgraph.local/api/v2.0/ping || echo "FAIL: Harbor API"

# 2. Check component health
echo "Checking components..."
kubectl get pods -n harbor -o wide

# 3. Check disk usage
echo "Checking disk usage..."
kubectl exec -n harbor harbor-registry-0 -- df -h /storage

# 4. Check recent scan results
echo "Checking vulnerability scan queue..."
curl -sf https://registry.intelgraph.local/api/v2.0/scanners | jq '.[] | {name, health}'

# 5. Check certificate expiry
echo "Checking TLS certificates..."
echo | openssl s_client -connect registry.intelgraph.local:443 2>/dev/null | \
  openssl x509 -noout -dates

echo "=== Health Check Complete ==="
```

### Monitoring Dashboards

1. **Grafana Dashboard**: `https://grafana.intelgraph.local/d/harbor`
   - Pull/push rates
   - Storage utilization
   - Scan queue depth
   - Error rates

2. **Key Metrics to Watch**:
   - `harbor_project_quota_usage_byte` > 80% - Storage alert
   - `harbor_core_http_request_duration_seconds` > 5s - Latency alert
   - `trivy_scan_queue_length` > 100 - Backlog alert

---

## Weekly Operations

### Weekly Sync Procedure (Sunday 02:00)

**Pre-requisites:**
- Approved image list reviewed by security team
- Transfer media prepared (encrypted USB)
- Sync workstation available

**Procedure:**

1. **Prepare Image List**
   ```bash
   # Review and approve images
   cat /etc/harbor-sync/approved-images.json

   # Verify no blocklisted images
   ./scripts/validate-image-list.sh /etc/harbor-sync/approved-images.json
   ```

2. **Execute Export**
   ```bash
   # On online sync workstation
   cd /opt/harbor-sync

   # Export with full verification
   npx ts-node sync/offline-sync.ts export \
     /etc/harbor-sync/approved-images.json \
     --config=/etc/harbor-sync/config.json

   # Verify export
   ls -la /var/lib/harbor-sync/export/
   ```

3. **Transfer to Air-Gapped Environment**
   ```bash
   # Copy to encrypted transfer media
   cp -r /var/lib/harbor-sync/export/* /media/transfer/

   # Generate transfer manifest
   sha256sum /media/transfer/*.tar.gz > /media/transfer/MANIFEST.sha256

   # Safely eject
   sync && umount /media/transfer
   ```

4. **Import in Air-Gapped Environment**
   ```bash
   # Mount transfer media
   mount /dev/sdb1 /media/transfer

   # Verify checksums
   cd /media/transfer
   sha256sum -c MANIFEST.sha256

   # Import images
   npx ts-node sync/offline-sync.ts import manifest-*.json

   # Verify import
   crane catalog registry.intelgraph.local | grep -f expected-images.txt
   ```

5. **Post-Import Verification**
   ```bash
   # Scan imported images
   for img in $(crane catalog registry.intelgraph.local); do
     echo "Scanning $img..."
     trivy image registry.intelgraph.local/$img
   done

   # Update scan database
   curl -X POST https://registry.intelgraph.local/api/v2.0/system/scanAll/schedule \
     -H "Authorization: Bearer $TOKEN"
   ```

### Weekly Maintenance Tasks

- [ ] Review vulnerability scan reports
- [ ] Check and rotate expiring certificates
- [ ] Review audit logs for anomalies
- [ ] Update Trivy vulnerability database
- [ ] Clean up unused images (garbage collection)

---

## Image Sync Procedures

### Emergency Image Sync

For urgent image requirements outside the weekly sync:

1. **Request Approval**
   - Submit emergency sync request to security team
   - Include justification and image details
   - Await written approval

2. **Expedited Sync**
   ```bash
   # Create emergency image list
   cat > /tmp/emergency-sync.json << EOF
   {
     "name": "emergency-sync-$(date +%Y%m%d)",
     "images": [
       {"ref": "critical/image:tag", "required": true, "notes": "TICKET-123"}
     ]
   }
   EOF

   # Execute with enhanced logging
   SYNC_LOG=/var/log/harbor-sync/emergency-$(date +%Y%m%d).log
   npx ts-node sync/offline-sync.ts export /tmp/emergency-sync.json 2>&1 | tee $SYNC_LOG
   ```

3. **Document and Review**
   - File incident report
   - Update approved image list
   - Review during next change advisory board

### Adding New Upstream Registry

1. **Security Review**
   ```bash
   # Document the registry
   cat >> /etc/harbor-sync/registries.yaml << EOF
   - name: new-registry
     endpoint: https://new-registry.example.com
     purpose: "Description of why needed"
     approvedBy: "security-team"
     approvedDate: "$(date +%Y-%m-%d)"
   EOF
   ```

2. **Configure Proxy Cache**
   ```bash
   # Add to Harbor proxy configuration
   kubectl edit configmap harbor-proxy-cache-config -n harbor

   # Add new registry entry under upstreamRegistries
   ```

3. **Test Connectivity** (from online workstation)
   ```bash
   crane auth login new-registry.example.com
   crane catalog new-registry.example.com
   ```

---

## Incident Response

### IR-001: Unsigned Image Detected

**Severity**: High
**Detection**: Admission webhook rejection, audit log alert

**Response:**

1. **Identify Source**
   ```bash
   # Check audit logs
   grep "NO_VALID_SIGNATURES" /var/log/harbor/audit.log | tail -20

   # Identify deployment attempting to use image
   kubectl get events -A | grep -i "image verification failed"
   ```

2. **Investigate**
   ```bash
   # Check if image should be signed
   cosign tree <image-ref>

   # Verify signature status
   cosign verify --certificate-identity-regexp='.*' \
     --certificate-oidc-issuer-regexp='.*' <image-ref>
   ```

3. **Remediate**
   - If image should be signed: Contact image owner to sign
   - If legitimate exception needed: Follow exception process
   - If malicious: Escalate to security team immediately

### IR-002: Critical Vulnerability Detected

**Severity**: Critical
**Detection**: Trivy scan alert, vulnerability dashboard

**Response:**

1. **Assess Impact**
   ```bash
   # Find all affected images
   curl -s "https://registry.intelgraph.local/api/v2.0/projects/*/repositories/*/artifacts?with_scan_overview=true" | \
     jq '.[] | select(.scan_overview.critical > 0)'

   # Find deployments using affected images
   kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.containers[*].image}{"\n"}{end}' | \
     grep <affected-image>
   ```

2. **Contain**
   ```bash
   # If actively exploited, isolate affected workloads
   kubectl label namespace <ns> pod-security.kubernetes.io/enforce=restricted

   # Block image pulls (if needed)
   kubectl patch deployment <deploy> -p '{"spec":{"template":{"spec":{"imagePullPolicy":"Never"}}}}'
   ```

3. **Remediate**
   - Update to patched image version
   - If no patch available: Apply compensating controls
   - Document in exception tracker with expiry date

4. **Post-Incident**
   - Update vulnerability policy if needed
   - Review detection time and improve if necessary
   - Conduct lessons learned session

### IR-003: Registry Unavailable

**Severity**: High
**Detection**: Health check failure, pull failures

**Response:**

1. **Diagnose**
   ```bash
   # Check pod status
   kubectl get pods -n harbor

   # Check recent events
   kubectl get events -n harbor --sort-by='.lastTimestamp'

   # Check resource usage
   kubectl top pods -n harbor
   ```

2. **Common Fixes**
   ```bash
   # Restart unhealthy pods
   kubectl delete pod -n harbor <unhealthy-pod>

   # Check PVC status
   kubectl get pvc -n harbor

   # Check database connectivity
   kubectl exec -n harbor harbor-database-0 -- pg_isready
   ```

3. **Escalate if Needed**
   - Contact on-call engineer if not resolved in 15 minutes
   - Page security if integrity concerns

---

## Maintenance Procedures

### Garbage Collection

Run weekly to reclaim storage from deleted images:

```bash
# Schedule garbage collection
curl -X POST "https://registry.intelgraph.local/api/v2.0/system/gc/schedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schedule":{"type":"Weekly","cron":"0 0 * * 0"}}'

# Manual trigger (off-hours only)
curl -X POST "https://registry.intelgraph.local/api/v2.0/system/gc" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"delete_untagged":true}'

# Monitor progress
curl "https://registry.intelgraph.local/api/v2.0/system/gc" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {status, deleted}'
```

### Certificate Rotation

Certificates must be rotated before expiry:

```bash
# Check current expiry
kubectl get secret harbor-tls -n harbor -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -enddate

# Generate new certificate (example with cert-manager)
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: harbor-tls
  namespace: harbor
spec:
  secretName: harbor-tls
  duration: 8760h # 1 year
  renewBefore: 720h # 30 days
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  dnsNames:
    - registry.intelgraph.local
EOF

# Verify new certificate
kubectl get certificate harbor-tls -n harbor
```

### Database Backup

Daily automated backups with weekly verification:

```bash
# Manual backup
kubectl exec -n harbor harbor-database-0 -- \
  pg_dump -U postgres harbor_core > /backup/harbor-$(date +%Y%m%d).sql

# Verify backup integrity
pg_restore --list /backup/harbor-$(date +%Y%m%d).sql

# Test restore (to test environment only)
psql -U postgres -d harbor_test < /backup/harbor-$(date +%Y%m%d).sql
```

---

## Disaster Recovery

### Scenario: Complete Registry Loss

**RTO**: 4 hours
**RPO**: 24 hours (last backup)

1. **Deploy New Harbor Instance**
   ```bash
   helm install harbor harbor/harbor \
     -n harbor --create-namespace \
     -f harbor/harbor-values.yaml
   ```

2. **Restore Database**
   ```bash
   # Copy backup to new database pod
   kubectl cp /backup/harbor-latest.sql harbor/harbor-database-0:/tmp/

   # Restore
   kubectl exec -n harbor harbor-database-0 -- \
     psql -U postgres -d harbor_core -f /tmp/harbor-latest.sql
   ```

3. **Re-sync Images**
   ```bash
   # Use most recent export manifest
   npx ts-node sync/offline-sync.ts import /backup/last-sync-manifest.json
   ```

4. **Verify Recovery**
   ```bash
   # Run full health check
   ./scripts/daily-health-check.sh

   # Verify critical images present
   crane catalog registry.intelgraph.local | wc -l
   ```

### Scenario: Compromised Image Detected

1. **Isolate**
   ```bash
   # Quarantine the image
   curl -X POST "https://registry.intelgraph.local/api/v2.0/projects/*/repositories/*/artifacts/*/labels" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"name":"QUARANTINED"}'
   ```

2. **Identify Blast Radius**
   ```bash
   # Find all deployments using the image
   kubectl get pods -A -o json | jq -r \
     '.items[] | select(.spec.containers[].image | contains("<compromised-image>")) |
     "\(.metadata.namespace)/\(.metadata.name)"'
   ```

3. **Remediate**
   - Roll back affected deployments to known-good images
   - Delete compromised image from registry
   - Rotate any secrets that may have been exposed

4. **Post-Incident**
   - Full security audit
   - Review how image was admitted
   - Update policies to prevent recurrence

---

## Appendix

### Useful Commands

```bash
# List all images in registry
crane catalog registry.intelgraph.local

# Check image signature
cosign tree registry.intelgraph.local/image:tag

# Get image vulnerabilities
trivy image registry.intelgraph.local/image:tag

# Check SLSA provenance
slsa-verifier verify-image registry.intelgraph.local/image:tag

# Harbor API - list projects
curl -s https://registry.intelgraph.local/api/v2.0/projects | jq '.[].name'

# Harbor API - get scan results
curl -s "https://registry.intelgraph.local/api/v2.0/projects/library/repositories/nginx/artifacts/latest?with_scan_overview=true" | \
  jq '.scan_overview'
```

### Log Locations

| Log | Location | Rotation |
|-----|----------|----------|
| Harbor Core | `/var/log/harbor/core.log` | Daily, 7 days |
| Registry | `/var/log/harbor/registry.log` | Daily, 7 days |
| Audit | `/var/log/harbor/audit.log` | Daily, 90 days |
| Sync | `/var/log/harbor-sync/sync.log` | Weekly, 30 days |

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-01-15 | Initial runbook creation | Platform Team |
