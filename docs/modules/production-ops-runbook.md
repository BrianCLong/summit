# GA-Core Production Operations Runbook

## IntelGraph Enterprise Intelligence Platform

### Emergency Response Procedures

#### P0: Export Blocked Unexpectedly

**Symptoms**: Users unable to export cases/investigations; 403/401 errors in export workflow

**Investigation Steps**:

1. Grab `trace_id` from 4xx response payload in user's browser dev tools
2. Query policy decision log by trace_id:
   ```bash
   kubectl logs deploy/api -n intelgraph | grep "trace_id:${TRACE_ID}" | jq .policy_decision
   ```
3. Confirm actor scope, authority binding, and clearance level
4. Check authority binding expiry:
   ```cypher
   MATCH (a:Authority {binding_id: $bindingId})
   RETURN a.expires_at, datetime() as now, a.expires_at < datetime() as expired
   ```

**Hotfix Options**:

- **Temporary Authority Exception** (tenant-scoped):
  ```bash
  # Edit policy rules
  kubectl edit configmap policy-rules -n intelgraph
  # Add temporary exception, then:
  helm upgrade --atomic intelgraph ./helm/intelgraph
  ```
- **Emergency Rollback** (if regression):
  ```bash
  helm rollback intelgraph $(helm history intelgraph -n intelgraph | grep DEPLOYED | tail -2 | head -1 | awk '{print $1}')
  ```

**Resolution Validation**:

- Test export with affected user credentials
- Verify authority binding logs show proper validation
- Confirm no other users affected by exception

---

#### P1: Detector Drift (False Positives Spike)

**Symptoms**: Anomaly alerts increase >2x baseline; user complaints about false positives

**Investigation Steps**:

1. Snapshot ROC curve from "Detector ROC (live)" Grafana dashboard
2. Identify which detector class is drifting:
   ```bash
   kubectl logs deploy/api -n intelgraph | grep "detector_result" | jq .detector_type | sort | uniq -c
   ```
3. Check recent model deployments:
   ```bash
   helm history ml-models -n intelgraph
   ```

**Immediate Mitigation**:

1. Lower detection threshold via configmap:
   ```yaml
   # In configmap/detectors-config
   detector_thresholds:
     anomaly: 0.85 # was 0.75, raising threshold reduces sensitivity
     pattern: 0.90 # was 0.80
     behavioral: 0.88 # was 0.78
   ```
2. Apply configuration:
   ```bash
   kubectl apply -f k8s/configmaps/detectors-config.yaml
   kubectl rollout restart deployment/api -n intelgraph
   ```

**Long-term Resolution**:

- Open ML retraining task with 7-day window
- Backtest against known good dataset
- Generate model card delta showing performance changes

---

#### P1: Neo4j Hot Index Missing

**Symptoms**: Graph queries timing out; high CPU on Neo4j; query plans show table scans

**Diagnosis**:

```cypher
// Check current indexes
SHOW INDEXES YIELD name, type, entityType, properties, state
WHERE state <> "ONLINE"
RETURN name, type, entityType, properties, state;

// Check slow queries
CALL dbms.listQueries()
YIELD queryId, query, elapsedTimeMillis, status
WHERE elapsedTimeMillis > 5000
RETURN queryId, query, elapsedTimeMillis;
```

**Resolution**:

```cypher
// Create critical indexes
CREATE INDEX entity_id IF NOT EXISTS FOR (e:Entity) ON (e.id);
CREATE INDEX case_id IF NOT EXISTS FOR (c:Case) ON (c.id);
CREATE INDEX relationship_type IF NOT EXISTS FOR ()-[r:LINKED_TO]-() ON (r.type);
CREATE INDEX temporal_index IF NOT EXISTS FOR (e:Entity) ON (e.createdAt);

// Verify index creation
SHOW INDEXES YIELD name, type, entityType, properties, state
WHERE entityType IN ['Entity', 'Case'] AND state = "ONLINE";
```

**Refresh Query Plans**:

```bash
# Rolling restart to refresh query planner cache
kubectl rollout restart deployment/api -n intelgraph
```

---

#### P2: TimescaleDB Chunk Bloat

**Symptoms**: Database storage growing faster than expected; query performance degrading on temporal queries

**Investigation**:

```sql
-- Check chunk statistics
SELECT
    hypertable_name,
    chunk_name,
    total_bytes / (1024^3) as size_gb,
    compressed,
    compression_ratio
FROM timescaledb_information.chunks
ORDER BY total_bytes DESC LIMIT 20;

-- Check compression policies
SELECT * FROM timescaledb_information.compression_settings;
```

**Resolution**:

```sql
-- Reorder chunks for better compression
SELECT reorder_chunk(i)
FROM show_chunks('telemetry', older_than => INTERVAL '7 days') i;

-- Compress eligible chunks
SELECT compress_chunk(i)
FROM show_chunks('telemetry', older_than => INTERVAL '7 days') i
WHERE NOT is_compressed(i);

-- Add missing policies if needed
SELECT add_compression_policy('telemetry', INTERVAL '7 days');
SELECT add_retention_policy('telemetry', INTERVAL '30 days');

-- Verify results
SELECT
    hypertable_name,
    compression_enabled,
    chunk_count,
    compressed_chunk_count
FROM timescaledb_information.hypertables;
```

---

### Security & Compliance Hardening (Day-0)

#### Headers/CSP (UI behind Gateway)

**Required Security Headers**:

```nginx
# In gateway/nginx.conf
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:; font-src 'self' https://fonts.gstatic.com; object-src 'none'; media-src 'self'; frame-ancestors 'none';" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

**Validation**:

```bash
curl -I https://app.intelgraph.com | grep -E "(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options)"
```

#### Secrets Hygiene

**Rotate Production Secrets** (within 72h of GA):

```bash
# Generate new JWT secrets
openssl rand -base64 32 > jwt-secret.txt
openssl rand -base64 32 > jwt-refresh-secret.txt

# Update Kubernetes secrets
kubectl create secret generic app-secrets \
  --from-file=jwt-secret=jwt-secret.txt \
  --from-file=jwt-refresh-secret=jwt-refresh-secret.txt \
  --dry-run=client -o yaml | kubectl apply -f -

# Rolling update to pick up new secrets
kubectl rollout restart deployment/api -n intelgraph
```

**Gitleaks v8 Enforcement**:

```bash
# CI step: scan for secrets
gitleaks detect --source . --verbose --redact
if [ $? -ne 0 ]; then
  echo "Secrets detected! Blocking deployment."
  exit 1
fi
```

#### PII Redaction Assertions

**Canary Log Regex Checks**:

```bash
# CI step: basic PII log sentinel
- name: PII log sentinel
  run: |
    if grep -R -E "(ssn|\\b\\d{3}-\\d{2}-\\d{4}\\b|passport|DOB:|credit.card)" ./logs/*; then
      echo "PII pattern detected in logs";
      exit 1;
    fi
    if grep -R -E "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b" ./logs/* | grep -v "@intelgraph.com"; then
      echo "External email addresses in logs";
      exit 1;
    fi
```

#### Database Backups & DR

**TimescaleDB Backup**:

```bash
#!/bin/bash
# Daily backup script
TIMESTAMP=$(date +%F_%H-%M-%S)
pg_dump -Fc -j4 \
  -h $POSTGRES_HOST \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  > "/backups/timescaledb_${TIMESTAMP}.dump"

# Upload to S3 with encryption
aws s3 cp "/backups/timescaledb_${TIMESTAMP}.dump" \
  "s3://intelgraph-backups/database/" \
  --server-side-encryption aws:kms \
  --sse-kms-key-id $KMS_KEY_ID

# Verify backup integrity
pg_restore --list "/backups/timescaledb_${TIMESTAMP}.dump" > /dev/null
echo "Backup ${TIMESTAMP} integrity verified"
```

**Neo4j Online Backup**:

```bash
#!/bin/bash
TIMESTAMP=$(date +%F_%H-%M-%S)
neo4j-admin backup \
  --from=$NEO4J_HOST:6362 \
  --backup-dir="/backups/neo4j_${TIMESTAMP}" \
  --database=neo4j \
  --check-consistency

# Archive and encrypt
tar czf "/backups/neo4j_${TIMESTAMP}.tar.gz" "/backups/neo4j_${TIMESTAMP}"
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
  --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric \
  --output "/backups/neo4j_${TIMESTAMP}.tar.gz.gpg" \
  "/backups/neo4j_${TIMESTAMP}.tar.gz"
```

### Feature Flags (Operational Toggles)

| Flag                  | Default | Purpose                         | Roll-forward Plan                           |
| --------------------- | ------- | ------------------------------- | ------------------------------------------- |
| `detector_v2`         | `off`   | New ML scoring pipeline         | Enable 10% → 50% → 100% with ROC monitoring |
| `prov.strictVerify`   | `on`    | Block export on verify warnings | If noisy, set to warn-only for 1h           |
| `xai.shap`            | `on`    | SHAP explainer algorithm        | Keep enabled; gated by GPU availability     |
| `ui.demoMode`         | `off`   | Redact tenant data in demos     | Enable for public demos only                |
| `streaming.piiRedact` | `on`    | Real-time PII redaction         | Never disable; monitor for drift            |

**Feature Flag Management**:

```bash
# Update feature flag
kubectl patch configmap feature-flags -n intelgraph \
  --patch '{"data":{"detector_v2":"10%"}}'

# Rolling deployment to pick up changes
kubectl rollout restart deployment/api -n intelgraph

# Monitor rollout
kubectl rollout status deployment/api -n intelgraph
```

### jQuery UI Integration Snippets

**Toggle XAI & Provenance Overlays**:

```html
<script>
  (function ($) {
    // Toggle XAI & provenance overlays using jQuery events
    $('#overlay-xai, #overlay-prov').on('click', function () {
      var overlay = $(this).attr('id').replace('overlay-', '');
      var isActive = $(this).hasClass('active');

      $.ajax({
        url: '/api/overlays/toggle',
        method: 'POST',
        data: JSON.stringify({
          overlay: overlay,
          enabled: !isActive,
          caseId: window.currentCaseId,
        }),
        contentType: 'application/json',
        headers: {
          Authorization: 'Bearer ' + window.authToken,
        },
      })
        .done(function (response) {
          // Update UI state
          $('#overlay-' + overlay).toggleClass('active');

          // Refresh graph badges
          $('[data-graph]').trigger('refresh-badges', [response.badgeData]);

          // Update overlay legend
          updateOverlayLegend(overlay, !isActive);
        })
        .fail(function (xhr) {
          console.error('Overlay toggle failed:', xhr.responseText);
          showToast('Failed to toggle ' + overlay + ' overlay', 'error');
        });
    });

    // Tri-pane sync: timeline drives graph selection
    $('#timeline .scrub').on('input', function () {
      var timeWindow = $(this).val();
      var startTime = moment().subtract(timeWindow, 'minutes').toISOString();
      var endTime = moment().toISOString();

      $.ajax({
        url: '/api/timeline/select',
        method: 'POST',
        data: JSON.stringify({
          startTime: startTime,
          endTime: endTime,
          caseId: window.currentCaseId,
        }),
        contentType: 'application/json',
        headers: {
          Authorization: 'Bearer ' + window.authToken,
        },
      }).done(function (response) {
        // Update graph selection
        $('[data-graph]').trigger('select-nodes', [response.nodeIds]);

        // Update map markers
        $('[data-map]').trigger('update-markers', [response.entities]);

        // Update entity details panel
        updateEntityDetailsPanel(response.entities);
      });
    });

    function updateOverlayLegend(overlay, enabled) {
      var legend = $('.overlay-legend[data-overlay="' + overlay + '"]');
      if (enabled) {
        legend.show().addClass('active');
      } else {
        legend.hide().removeClass('active');
      }
    }

    function showToast(message, type) {
      var toast = $(
        '<div class="toast toast-' + type + '">' + message + '</div>',
      );
      $('.toast-container').append(toast);
      setTimeout(function () {
        toast.fadeOut(300, function () {
          $(this).remove();
        });
      }, 3000);
    }
  })(jQuery);
</script>
```

### Performance Budget Validation

**Core Web Vitals Monitoring**:

```javascript
// Add to main application bundle
import { getLCP, getFID, getCLS, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id, delta }) {
  // Send to monitoring endpoint
  fetch('/api/metrics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: name,
      value,
      id,
      delta,
      url: location.href,
    }),
  });
}

getLCP(sendToAnalytics);
getFID(sendToAnalytics);
getCLS(sendToAnalytics);
getTTFB(sendToAnalytics);

// Alert on budget violations
function checkPerformanceBudgets() {
  const budgets = {
    LCP: 2500, // 2.5s
    FID: 100, // 100ms
    CLS: 0.1, // 0.1 layout shift
    TTFB: 600, // 600ms
  };

  Object.entries(budgets).forEach(([metric, threshold]) => {
    const value = performance.getEntriesByName(metric)[0]?.value || 0;
    if (value > threshold) {
      console.warn(
        `Performance budget violation: ${metric} = ${value}ms (threshold: ${threshold}ms)`,
      );
      // Send alert to monitoring
      sendToAnalytics({
        name: 'budget_violation',
        value: value,
        id: metric,
        delta: value - threshold,
      });
    }
  });
}

// Check budgets after page load
window.addEventListener('load', () => {
  setTimeout(checkPerformanceBudgets, 1000);
});
```
