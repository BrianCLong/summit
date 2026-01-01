# Evidence Ecosystem Integration Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-31
**Status:** Production Ready

## Overview

This guide provides partner-ready examples, sample payloads, and integration instructions for Summit's ecosystem export capabilities. After reading this guide, you should be able to:

1. Integrate Summit with your SIEM platform
2. Consume compliance evidence in your GRC tools
3. Generate customer transparency reports
4. Verify export integrity and reproducibility

---

## Quick Start

### Prerequisites

- Summit server running with database migrations applied
- API credentials with appropriate permissions
- Network access to Summit API endpoints

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/summit.git
cd summit

# Install dependencies
pnpm install

# Run migrations
cd server
npx tsx scripts/run-migrations.ts

# Start server
pnpm dev
```

---

## 1. SIEM Integration Examples

### 1.1 Pull-Based Export (Query)

Fetch security signals from Summit for ingestion into your SIEM.

**Endpoint:** `GET /api/v1/siem/export/signals`

**Example Request:**

```bash
curl -X GET "https://summit.example.com/api/v1/siem/export/signals" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -G \
  --data-urlencode "startTime=2025-12-24T00:00:00.000Z" \
  --data-urlencode "endTime=2025-12-31T23:59:59.999Z" \
  --data-urlencode "minSeverity=medium" \
  --data-urlencode "limit=100"
```

**Example Response:**

```json
{
  "signals": [
    {
      "schemaVersion": "1.0.0",
      "exportedAt": "2025-12-31T12:00:00.000Z",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-12-31T11:45:23.456Z",
      "severity": "high",
      "category": "Authorization",
      "signatureId": "SUMMIT-AUTHORIZATION-AUTHZ_DENIED",
      "name": "Authz Denied",
      "sourceUser": "user_a1b2c3d4e5f6g7h8",
      "sourceTenant": "00000000-0000-0000-0000-000000000001",
      "sourceIp": "192.168.1.XXX",
      "destinationResource": "sensitive_data",
      "destinationResourceId": "resource_9876543210abcdef",
      "outcome": "blocked",
      "message": "Access denied to confidential resource",
      "requestId": "req-12345",
      "correlationId": "corr-67890",
      "ruleId": "policy-authz-001",
      "policyVersion": "v2.1.0",
      "threatScore": 75,
      "auditEventId": "ae-550e8400-e29b-41d4-a716-446655440000",
      "complianceFrameworks": ["SOC2", "GDPR"]
    }
  ],
  "pagination": {
    "cursor": "MjAyNS0xMi0zMVQxMTo0NToyMy40NTZafDU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMA==",
    "hasMore": true,
    "total": null
  }
}
```

### 1.2 Pagination Example

```bash
# First page
RESPONSE=$(curl -X GET "https://summit.example.com/api/v1/siem/export/signals" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -G \
  --data-urlencode "startTime=2025-12-01T00:00:00.000Z" \
  --data-urlencode "endTime=2025-12-31T23:59:59.999Z" \
  --data-urlencode "limit=100")

# Extract cursor
CURSOR=$(echo $RESPONSE | jq -r '.pagination.cursor')

# Second page
curl -X GET "https://summit.example.com/api/v1/siem/export/signals" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -G \
  --data-urlencode "startTime=2025-12-01T00:00:00.000Z" \
  --data-urlencode "endTime=2025-12-31T23:59:59.999Z" \
  --data-urlencode "limit=100" \
  --data-urlencode "cursor=$CURSOR"
```

### 1.3 Splunk Integration Example

**HTTP Event Collector (HEC) Configuration:**

```javascript
// splunk-summit-forwarder.js
import axios from 'axios';

const SUMMIT_API = 'https://summit.example.com/api/v1';
const SPLUNK_HEC = 'https://splunk.example.com:8088/services/collector/event';

async function forwardToSplunk() {
  // Fetch signals from Summit
  const response = await axios.get(`${SUMMIT_API}/siem/export/signals`, {
    headers: {
      'Authorization': `Bearer ${process.env.SUMMIT_API_TOKEN}`,
      'X-Tenant-ID': process.env.SUMMIT_TENANT_ID
    },
    params: {
      startTime: new Date(Date.now() - 3600000).toISOString(), // Last hour
      endTime: new Date().toISOString(),
      minSeverity: 'low'
    }
  });

  // Forward to Splunk
  for (const signal of response.data.signals) {
    await axios.post(SPLUNK_HEC, {
      time: new Date(signal.timestamp).getTime() / 1000,
      host: 'summit',
      source: 'summit-api',
      sourcetype: 'summit:security:signal',
      index: 'security',
      event: signal
    }, {
      headers: {
        'Authorization': `Splunk ${process.env.SPLUNK_HEC_TOKEN}`
      }
    });
  }

  console.log(`Forwarded ${response.data.signals.length} signals to Splunk`);
}

// Run every 5 minutes
setInterval(forwardToSplunk, 5 * 60 * 1000);
```

### 1.4 Elasticsearch Integration Example

```javascript
// elasticsearch-summit-forwarder.js
import { Client } from '@elastic/elasticsearch';
import axios from 'axios';

const client = new Client({
  node: 'https://elasticsearch.example.com:9200',
  auth: {
    apiKey: process.env.ELASTIC_API_KEY
  }
});

async function forwardToElasticsearch() {
  const response = await axios.get(`${SUMMIT_API}/siem/export/signals`, {
    headers: {
      'Authorization': `Bearer ${process.env.SUMMIT_API_TOKEN}`,
      'X-Tenant-ID': process.env.SUMMIT_TENANT_ID
    },
    params: {
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date().toISOString()
    }
  });

  const operations = response.data.signals.flatMap(signal => [
    { index: { _index: 'summit-security-signals' } },
    signal
  ]);

  const bulkResponse = await client.bulk({ operations });

  if (bulkResponse.errors) {
    console.error('Bulk indexing errors:', bulkResponse.items);
  } else {
    console.log(`Indexed ${response.data.signals.length} signals`);
  }
}
```

---

## 2. GRC / Compliance Export Examples

### 2.1 Export Control Mappings

**Endpoint:** `GET /api/v1/grc/export/control-mappings`

**Example Request:**

```bash
curl -X GET "https://summit.example.com/api/v1/grc/export/control-mappings" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -G \
  --data-urlencode "framework=SOC2_TYPE_II" \
  --data-urlencode "mode=snapshot"
```

**Example Response:**

```json
{
  "controlMappings": [
    {
      "schemaVersion": "1.0.0",
      "exportedAt": "2025-12-31T12:00:00.000Z",
      "controlId": "ctrl-cc6-1",
      "framework": "SOC2_TYPE_II",
      "frameworkControlId": "CC6.1",
      "control": {
        "name": "Logical and Physical Access Controls",
        "description": "The entity implements logical access controls to prevent unauthorized access to data and IT resources",
        "category": "Access Control",
        "criticality": "high"
      },
      "implementation": {
        "status": "implemented",
        "implementedAt": "2025-01-15T10:00:00.000Z",
        "implementedBy": "TenantSafePostgres",
        "automationLevel": "automated"
      },
      "evidence": [
        {
          "id": "evidence-001",
          "type": "audit_log",
          "location": "/evidence/audit-trail-2025-12.json",
          "hash": "a7f5c8d9e4b3a2f1c3e5d4b6a8f7c9e1b2d4a5c6e8f9a1b3c5d7e9f1a3b5c7d9",
          "collectedAt": "2025-12-31T00:00:00.000Z",
          "retentionPeriod": 2555
        }
      ],
      "verification": {
        "lastVerified": "2025-12-30T15:00:00.000Z",
        "verifiedBy": "audit-system",
        "status": "passed",
        "findings": []
      },
      "relatedControls": ["ctrl-cc6-2", "ctrl-cc6-3"],
      "dependencies": []
    }
  ],
  "metadata": {
    "exportId": "export-123e4567-e89b-12d3-a456-426614174000",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "framework": "SOC2_TYPE_II",
    "mode": "snapshot",
    "generatedAt": "2025-12-31T12:00:00.000Z",
    "totalControls": 1
  }
}
```

### 2.2 Generate Evidence Package

**Endpoint:** `POST /api/v1/grc/export/evidence-package`

**Example Request:**

```bash
curl -X POST "https://summit.example.com/api/v1/grc/export/evidence-package" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "packageType": "soc2_type_ii",
    "periodStart": "2025-01-01T00:00:00.000Z",
    "periodEnd": "2025-12-31T23:59:59.999Z"
  }'
```

**Example Response:**

```json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2025-12-31T12:30:00.000Z",
  "packageId": "pkg-550e8400-e29b-41d4-a716-446655440000",
  "packageType": "soc2_type_ii",
  "createdBy": "user-admin",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "periodStart": "2025-01-01T00:00:00.000Z",
  "periodEnd": "2025-12-31T23:59:59.999Z",
  "contents": {
    "auditEvents": 125487,
    "controlMappings": 42,
    "evidenceArtifacts": 156,
    "attestations": 2
  },
  "artifacts": [
    {
      "id": "artifact-001",
      "type": "audit_trail",
      "name": "audit-events-2025.json",
      "path": "evidence/audit-events-2025.json",
      "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
      "size": 52428800,
      "classification": "confidential"
    }
  ],
  "attestations": [
    {
      "type": "package_seal",
      "issuer": "summit",
      "issuedAt": "2025-12-31T12:30:00.000Z",
      "algorithm": "HMAC-SHA256",
      "value": "f1e2d3c4b5a6978869504132435465768798a9b0c1d2e3f4g5h6i7j8k9l0m1n2"
    }
  ],
  "manifest": {
    "format": "zip",
    "totalSize": 52428800,
    "hash": "manifest-hash-123abc456def789ghi012jkl345mno678pqr901stu234vwx567yza890bcd",
    "signaturePublicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
  },
  "expiresAt": "2026-01-07T12:30:00.000Z",
  "retentionPeriod": 2555
}
```

### 2.3 Delta Export (Incremental)

```bash
# Export only controls modified since last audit
curl -X GET "https://summit.example.com/api/v1/grc/export/control-mappings" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -G \
  --data-urlencode "mode=delta" \
  --data-urlencode "sinceDate=2025-12-01T00:00:00.000Z"
```

---

## 3. Transparency Report Examples

### 3.1 Generate Report (Command Line)

```bash
# Generate Markdown report
npx tsx scripts/generate-transparency-report.ts \
  --tenant 00000000-0000-0000-0000-000000000001 \
  --start 2025-01-01T00:00:00.000Z \
  --end 2025-12-31T23:59:59.999Z \
  --format md \
  --output transparency-report-2025.md

# Generate HTML report
npx tsx scripts/generate-transparency-report.ts \
  --tenant 00000000-0000-0000-0000-000000000001 \
  --start 2025-01-01T00:00:00.000Z \
  --end 2025-12-31T23:59:59.999Z \
  --format html \
  --output transparency-report-2025.html

# Generate JSON report
npx tsx scripts/generate-transparency-report.ts \
  --tenant 00000000-0000-0000-0000-000000000001 \
  --start 2025-01-01T00:00:00.000Z \
  --end 2025-12-31T23:59:59.999Z \
  --format json \
  --output transparency-report-2025.json
```

### 3.2 Sample Transparency Report Output

See `transparency-report-sample.md` below:

```markdown
# Transparency Report

**Report ID:** report-550e8400-e29b-41d4-a716-446655440000
**Tenant:** 00000000-0000-0000-0000-000000000001
**Period:** 2025-01-01T00:00:00.000Z to 2025-12-31T23:59:59.999Z
**Generated:** 2025-12-31T15:00:00.000Z
**Report Hash:** a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

---

## 1. Data Usage

**Summary:** Summit processes data exclusively for agent orchestration, policy enforcement, and compliance monitoring.

**Purposes:**
- Agent execution and orchestration
- Security policy enforcement
- Compliance monitoring and reporting
- Audit trail maintenance
- Performance analytics

**Retention Policy:** 7 years for audit data (SOX compliance), 90 days for operational data

**Deletion Rights:** Customers may request data deletion subject to legal retention requirements

---

## 2. Agent Usage Summary

- **Total Agent Runs:** 1,245
- **Success Rate:** 98.50%
- **Average Duration:** 12.34s

---

## 3. Security Posture

### Authentication Events
- **Total:** 3,456
- **Successful:** 3,401
- **Failed:** 55

### Authorization Decisions
- **Total:** 12,789
- **Allowed:** 12,234
- **Denied:** 555

---

[... additional sections ...]
```

---

## 4. Reproducibility & Verification

### 4.1 Verify Report Hash

```bash
# Calculate hash of report
REPORT_FILE="transparency-report-2025.json"
EXPECTED_HASH=$(jq -r '.metadata.reportHash' $REPORT_FILE)

# Remove hash from report for verification
jq '.metadata.reportHash = ""' $REPORT_FILE > /tmp/report-no-hash.json

# Calculate actual hash
ACTUAL_HASH=$(sha256sum /tmp/report-no-hash.json | awk '{print $1}')

# Compare
if [ "$EXPECTED_HASH" = "$ACTUAL_HASH" ]; then
  echo "✓ Report integrity verified"
else
  echo "✗ Report integrity check failed"
fi
```

### 4.2 Verify Evidence Package

```bash
# Verify package seal
PACKAGE_FILE="evidence-package.json"
PACKAGE_SEAL=$(jq -r '.attestations[] | select(.type == "package_seal") | .value' $PACKAGE_FILE)

# Verify manifest hash
MANIFEST_HASH=$(jq -r '.manifest.hash' $PACKAGE_FILE)
CALCULATED_HASH=$(jq -c '.artifacts, .attestations' $PACKAGE_FILE | sha256sum | awk '{print $1}')

if [ "$MANIFEST_HASH" = "$CALCULATED_HASH" ]; then
  echo "✓ Manifest integrity verified"
else
  echo "✗ Manifest integrity check failed"
fi
```

---

## 5. Known Limitations

### Current Limitations

1. **Export Size:** Single exports limited to 10,000 events (use pagination)
2. **Time Range:** Maximum 30-day range for single query
3. **Rate Limits:** 100 requests/hour for real-time, 10 jobs/hour for bulk
4. **Retention:** Export download links expire after 7 days

### Roadmap

- **Q1 2026:** Streaming export API (Server-Sent Events)
- **Q2 2026:** Custom SIEM connectors (Datadog, Sumo Logic)
- **Q3 2026:** Real-time webhooks for security signals
- **Q4 2026:** GraphQL export API

---

## 6. Commands Reference

### Quick Reference

```bash
# SIEM Export (Pull)
curl -X GET "${SUMMIT_API}/siem/export/signals" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-ID: ${TENANT_ID}" \
  -G --data-urlencode "startTime=2025-12-01T00:00:00.000Z" \
     --data-urlencode "endTime=2025-12-31T23:59:59.999Z"

# GRC Control Mappings
curl -X GET "${SUMMIT_API}/grc/export/control-mappings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-ID: ${TENANT_ID}" \
  -G --data-urlencode "framework=SOC2_TYPE_II" \
     --data-urlencode "mode=snapshot"

# Evidence Package
curl -X POST "${SUMMIT_API}/grc/export/evidence-package" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-ID: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"packageType":"soc2_type_ii","periodStart":"2025-01-01T00:00:00.000Z","periodEnd":"2025-12-31T23:59:59.999Z"}'

# Transparency Report
npx tsx scripts/generate-transparency-report.ts \
  --tenant ${TENANT_ID} \
  --start 2025-01-01T00:00:00.000Z \
  --end 2025-12-31T23:59:59.999Z \
  --format md \
  --output report.md
```

---

## 7. Troubleshooting

### Common Issues

**Issue:** `401 Unauthorized`
**Solution:** Check API token and ensure it has required permissions (`siem:export:read`, `grc:export:read`)

**Issue:** `400 Invalid Time Range`
**Solution:** Ensure time range does not exceed 30 days for single query

**Issue:** `429 Rate Limit Exceeded`
**Solution:** Implement exponential backoff or use batch export mode

**Issue:** Empty results despite having audit events
**Solution:** Ensure `compliance_relevant = true` for events to appear in exports

---

## 8. Support

For questions or issues:

- **Documentation:** `/docs/integrations/`
- **API Reference:** `/docs/api/export-and-nlq.md`
- **Export Contracts:** `/docs/integrations/EXPORT_CONTRACTS.md`
- **GitHub Issues:** `https://github.com/your-org/summit/issues`

---

## Appendix A: Sample Payloads

Complete sample payloads are available in:

- `examples/siem-export-sample.json`
- `examples/grc-export-sample.json`
- `examples/transparency-report-sample.json`

---

*Last updated: 2025-12-31 | Version: 1.0.0*
