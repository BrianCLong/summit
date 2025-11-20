# DNS/WHOIS Infrastructure Connector

**Version**: 1.0.0
**Status**: 🟡 In Development
**Author**: IntelGraph Data Intake Team

## Overview

The DNS/WHOIS connector ingests domain infrastructure data including DNS records and WHOIS registration information. This connector is essential for infrastructure analysis, domain ownership tracking, threat intelligence, and incident response.

**⚠️ PRIVACY WARNING**: WHOIS data contains PII (names, emails, phone numbers). This connector implements automatic PII detection and redaction in compliance with GDPR.

## Features

✅ **DNS Resolution**: A, AAAA, MX, NS, TXT, CNAME records
✅ **WHOIS Lookup**: Domain registration, ownership, contact information
✅ **Multiple Entity Types**: Domain, Organization, Person, IPAddress
✅ **PII Protection**: Automatic detection and redaction (mask/hash/remove)
✅ **Rate Limiting**: Respects WHOIS server rate limits
✅ **GDPR Compliant**: Right to erasure, data minimization, lawful basis
✅ **Relationship Mapping**: REGISTERED_TO, RESOLVES_TO, HAS_NAMESERVER, etc.

## Data Sources

| Type | Source | Authentication | Rate Limit |
|------|--------|----------------|------------|
| DNS | Google Public DNS (8.8.8.8) | None | ~10 req/sec |
| WHOIS | WHOIS servers (distributed) | None | ~1 req/sec |

## Entity Model

### Domain Entity

```yaml
type: Domain
properties:
  id: "domain:example.com"
  name: "example.com"
  domain_name: "example.com"
  registrar: "Example Registrar Inc."
  creation_date: "2000-01-01"
  expiration_date: "2025-12-31"
  status: ["clientTransferProhibited"]
  source: "dns-whois"
  confidence: 1.0
```

### Organization Entity

```yaml
type: Organization
properties:
  id: "org:abc123..."
  name: "Example Organization LLC"
  source: "dns-whois"
  confidence: 0.9
```

### Person Entity (PII REDACTED)

```yaml
type: Person
properties:
  id: "person:def456..."
  name: "J*** D***"  # REDACTED
  email: "j***@e***.com"  # REDACTED
  role: "registrant"
  source: "dns-whois"
  confidence: 0.8
_metadata:
  _pii_fields:
    - field: "name"
      pii_types: ["name"]
      redaction: "mask"
    - field: "email"
      pii_types: ["email"]
      redaction: "mask"
  _pii_redacted: true
```

### IPAddress Entity

```yaml
type: IPAddress
properties:
  id: "ip:93.184.216.34"
  ip_address: "93.184.216.34"
  version: "ipv4"
  source: "dns-whois"
  confidence: 1.0
```

## Relationships

| Type | Source → Target | Description |
|------|-----------------|-------------|
| REGISTERED_TO | Domain → Organization | Domain registration |
| MANAGED_BY | Domain → Person | Domain management contact |
| RESOLVES_TO | Domain → IPAddress | DNS A/AAAA records |
| HAS_NAMESERVER | Domain → Domain | Nameserver configuration |
| HAS_MX_RECORD | Domain → Domain | Mail exchange records |

## Installation

### Prerequisites

- Python >= 3.11
- Network access to DNS servers and WHOIS servers

### Dependencies

```bash
pip install dnspython>=2.4.0 python-whois>=0.8.0 httpx>=0.27.0 pydantic>=2.0.0
```

## Usage

### Basic Usage

```python
from connectors.dns_whois.schema_mapping import map_dns_whois_to_intelgraph

# Query domains
domains = ["example.com", "google.com"]
entities, relationships = map_dns_whois_to_intelgraph(domains)

print(f"Found {len(entities)} entities")
print(f"Found {len(relationships)} relationships")
```

### With PII Redaction

```python
# Configure PII redaction policy
config = {
    "include_dns": True,
    "include_whois": True,
    "pii_redaction": "mask",  # Options: 'mask', 'hash', 'remove'
}

entities, relationships = map_dns_whois_to_intelgraph(
    ["example.com"],
    config=config
)

# Verify PII was redacted
for entity in entities:
    if entity["type"] == "Person":
        assert entity["_metadata"]["_pii_redacted"] == True
```

### DNS Only (No PII)

```python
# Skip WHOIS to avoid PII concerns
config = {
    "include_dns": True,
    "include_whois": False,
}

entities, relationships = map_dns_whois_to_intelgraph(
    ["example.com"],
    config=config
)

# No Person entities or PII
```

### Custom DNS Servers

```python
config = {
    "dns_servers": ["1.1.1.1", "1.0.0.1"],  # Cloudflare DNS
}

entities, relationships = map_dns_whois_to_intelgraph(
    ["example.com"],
    config=config
)
```

## Configuration

```python
config = {
    # Feature flags
    "include_dns": True,        # Include DNS lookups
    "include_whois": True,      # Include WHOIS lookups
    "include_metadata": False,  # Include raw records in metadata

    # PII handling
    "pii_redaction": "mask",    # 'mask' | 'hash' | 'remove'

    # DNS configuration
    "dns_servers": ["8.8.8.8", "8.8.4.4"],

    # WHOIS configuration
    "whois_timeout": 10,        # Timeout in seconds
}
```

## PII Handling & GDPR Compliance

### Automatic PII Detection

The connector automatically detects PII in WHOIS data:
- Names (registrant, admin, tech contacts)
- Email addresses
- Phone numbers
- Physical addresses

### Redaction Methods

#### Mask (Default)
```
Name: "John Doe" → "J*** D***"
Email: "john@example.com" → "j***@e***.com"
Phone: "+1-234-567-8900" → "+**-***-***-****"
```

#### Hash
```
Name: "John Doe" → "a1b2c3d4e5f6g7h8"  (SHA-256 truncated)
Email: "john@example.com" → "1a2b3c4d5e6f7g8h"
```

#### Remove
```
Name: "John Doe" → "[REDACTED]"
Email: "john@example.com" → "[REDACTED]"
```

### GDPR Rights

The connector supports all GDPR data subject rights:

- **Right to Access**: Query by person ID
- **Right to Erasure**: Delete records via DSAR process
- **Right to Rectification**: Update at WHOIS source
- **Right to Portability**: Export as JSON
- **Right to Object**: Block processing for specific domains

### Data Retention

- **Default**: 90 days (shorter due to PII)
- **Backup**: 30 days
- **Auto-deletion**: After retention period
- **Legal hold**: Supported for investigations

## Rate Limiting

### DNS Queries

- **Rate**: 10 requests/second
- **Timeout**: 5 seconds
- **Retry**: None (DNS is fast)

### WHOIS Queries

- **Rate**: 1 request/second (configurable)
- **Burst**: 5 requests
- **Timeout**: 10 seconds
- **Retry**: 3 attempts with exponential backoff
- **Daily limit**: 1000 queries (some servers)

### Best Practices

```python
import time

domains = ["example1.com", "example2.com", "example3.com"]

for domain in domains:
    entities, rels = map_dns_whois_to_intelgraph([domain])
    time.sleep(1)  # Respect rate limits
```

## Error Handling

### Common Errors

| Error | Cause | Handling |
|-------|-------|----------|
| `NXDOMAIN` | Domain doesn't exist | Skip, log warning |
| `Timeout` | DNS/WHOIS server slow | Retry with backoff |
| `Rate Limit` | Too many requests | Wait and retry |
| `Invalid Domain` | Malformed domain name | Skip, log error |
| `No WHOIS Data` | Private registration | Continue with DNS only |

### Example

```python
try:
    entities, rels = map_dns_whois_to_intelgraph(["example.com"])
except Exception as e:
    logger.error(f"Failed to process domain: {e}")
    # Continue processing other domains
```

## Testing

### Run Unit Tests

```bash
pytest connectors/dns-whois/__tests__/test_mapping.py -v
```

### Run Golden Tests

```bash
pytest connectors/dns-whois/__tests__/test_golden.py -v
```

### Test PII Redaction

```bash
pytest connectors/dns-whois/__tests__/test_mapping.py::TestPIIRedaction -v
```

## Compliance

### DPIA Status

✅ **APPROVED** with conditions
- Complete DPIA in `.dpia.yaml`
- High PII risk, comprehensive mitigations
- Quarterly reviews required

### Data Classification

- **DNS Records**: Public
- **Domain Info**: Internal
- **WHOIS with PII**: Confidential

### Lawful Basis

**Legitimate Interest** (GDPR Article 6(1)(f))
- Purpose: Infrastructure security analysis
- Necessity: Essential for threat detection
- Balancing: Security benefits outweigh minimal privacy impact
- Safeguards: PII redaction, data minimization, short retention

## Monitoring & Alerts

### Metrics

```
dns_whois_queries_total{type="dns|whois", status="success|failure"}
dns_whois_latency_seconds{type="dns|whois"}
dns_whois_pii_detected_total{field="name|email|phone"}
dns_whois_rate_limit_exceeded_total
```

### SLI/SLO

- **Availability**: 95% (external dependencies)
- **Latency (P95)**: < 5 seconds
- **Throughput**: 60 records/minute minimum
- **PII Detection**: 100% (critical)

### Alerts

- **PII Leakage**: Unredacted PII detected in output
- **Rate Limit**: Excessive WHOIS queries
- **SLO Breach**: Availability or latency SLO violated

## Security Considerations

### Threat Model

1. **PII Exposure**: Unredacted PII leaked → Mitigated by automatic redaction
2. **GDPR Violation**: EU resident data mishandled → Mitigated by compliance framework
3. **Query Fingerprinting**: WHOIS servers log our queries → Mitigated by query rotation
4. **Rate Limit Ban**: IP blocked by WHOIS servers → Mitigated by throttling

### Security Controls

- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- RBAC access controls
- MFA required
- Audit logging
- PII access monitoring

## Performance

**Typical Performance**:
- DNS query: 50-200ms
- WHOIS query: 1-5 seconds
- Total per domain: 1-6 seconds
- Throughput: 60-600 domains/hour (depends on WHOIS ratio)

**Optimization Tips**:
- Cache DNS results (24h TTL)
- Skip WHOIS if only infrastructure data needed
- Batch domains by TLD to minimize WHOIS server switching
- Use commercial WHOIS APIs for higher rate limits

## Limitations

1. **WHOIS Accuracy**: Data may be outdated or incorrect
2. **Private Registration**: Many domains use privacy services
3. **Rate Limits**: WHOIS servers are slow and restrictive
4. **Incomplete Data**: Some TLDs have limited WHOIS
5. **PII Sensitivity**: Handling PII requires strict controls

## Roadmap

### Phase 1 (Current)
- [x] DNS resolution (A, AAAA, MX, NS)
- [x] Basic WHOIS lookup
- [x] PII detection and redaction
- [x] GDPR compliance framework

### Phase 2 (Next)
- [ ] Commercial WHOIS API integration (higher limits)
- [ ] Historical WHOIS tracking (change detection)
- [ ] Passive DNS integration
- [ ] Threat intel enrichment (malicious domains)

### Phase 3 (Future)
- [ ] Certificate transparency logs
- [ ] Subdomain enumeration
- [ ] DNS security (DNSSEC validation)
- [ ] Bulk domain monitoring

## References

- [DNS RFC 1035](https://www.ietf.org/rfc/rfc1035.txt)
- [WHOIS RFC 3912](https://www.ietf.org/rfc/rfc3912.txt)
- [GDPR Article 6](https://gdpr.eu/article-6-how-to-process-personal-data-legally/)
- [IntelGraph Connector Spec](../../docs/architecture/data-intake-ga-spec.md)

## Support

- **Issues**: https://github.com/intelgraph/summit/issues
- **Documentation**: https://docs.intelgraph.io/connectors/dns-whois
- **Email**: data-intake-team@intelgraph.io
- **Privacy Questions**: dpo@intelgraph.io

## License

MIT License - See LICENSE file for details

**Data Sources**:
- DNS: Public queries (no restrictions)
- WHOIS: Subject to individual server policies

## Changelog

### v1.0.0 (2025-11-20)

- Initial implementation
- DNS resolution (A, AAAA, MX, NS, TXT, CNAME)
- WHOIS lookup with PII redaction
- Complete GDPR compliance framework
- Full test suite (unit, E2E, golden)
- Demonstrates complex connector patterns
