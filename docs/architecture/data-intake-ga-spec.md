---
title: Data Intake & Preparation GA Specification
summary: Minimal but consistent specification for 10+ GA connectors with manifests, mappings, golden IO tests, and observability
owner: data-intake
version: 1.0.0
lastUpdated: 2025-11-20
status: proposed
---

# Data Intake & Preparation GA Specification

## Executive Summary

This document defines the minimal but consistent specification for bringing Data Intake & Preparation capabilities to General Availability (GA) status. It establishes standards for:

- **10+ Production Connectors** with complete manifests, mappings, and tests
- **Unified Connector Specification** for config schema, manifest, mapping contracts, tests, and observability
- **Golden IO Test Framework** for executable end-to-end validation
- **Compliance Integration** with DPIA, PII detection, and license enforcement
- **Telemetry Sanity** with SLI/SLO monitoring and observability hooks

## Current State Analysis

### Existing Connectors (15 total)

| Connector | Status | Has Manifest | Has Tests | Golden IO | PII Integration | License Check |
|-----------|--------|--------------|-----------|-----------|-----------------|---------------|
| CSV | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| JSON | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| DuckDB | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Elasticsearch | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Splunk | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Sentinel | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Chronicle | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| STIX/TAXII | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| ESRI | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mapbox | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| OFAC SDN | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| RSS News | ✅ Complete | ✅ | ✅ | ❌ | ❌ | ❌ |
| S3 CSV | 🟡 Partial | ✅ | ❌ | ❌ | ❌ | ❌ |
| MISP (TS) | ✅ Complete | ❌ | ❌ | ❌ | ❌ | ❌ |

### Target GA Connectors (from Wishbook)

**Required for GA:**
1. CSV/Parquet ✅ (CSV exists, needs Parquet support)
2. STIX/TAXII ✅ (exists, needs GA hardening)
3. MISP ⚠️ (TypeScript only, needs Python version)
4. GDELT/RSS ⚠️ (RSS exists, GDELT missing)
5. Sanctions ✅ (OFAC SDN exists)
6. DNS/WHOIS ❌ (missing)
7. CISA KEV ❌ (missing)
8. Slack/Jira (meta) ❌ (missing)
9. S3 🟡 (partial)
10. HTTP ⚠️ (exists in ingestion service, not in main connectors/)

### Gaps to Address

**Missing Capabilities:**
- ❌ Golden IO tests framework
- ❌ PII detection integration in connectors
- ❌ License registry enforcement hooks
- ❌ DPIA checklist automation
- ❌ Unified connector catalog/registry
- ❌ Rate limiting enforcement (declared but not implemented)
- ❌ Connector versioning/migration support

**Missing Connectors:**
- DNS/WHOIS
- CISA KEV
- GDELT
- MISP (Python)
- Slack/Jira metadata connectors

---

## Minimal Connector Specification v1.0

### 1. Directory Structure

```
connectors/{connector-name}/
├── manifest.yaml              # Connector metadata and configuration
├── schema_mapping.py          # Mapping logic (source → IntelGraph entities/rels)
├── sample.{csv,json,xml}      # Sample data for testing
├── connector.py               # Optional: custom connector implementation
├── __tests__/
│   ├── test_mapping.py        # Unit tests for schema mapping
│   ├── test_e2e.py            # End-to-end pipeline tests
│   └── golden/                # Golden IO test fixtures
│       ├── input/             # Sample inputs
│       ├── expected/          # Expected outputs
│       └── test_golden.py     # Golden IO tests
├── README.md                  # Usage documentation
└── .dpia.yaml                 # Data Protection Impact Assessment
```

### 2. Manifest Schema (manifest.yaml)

**Required Fields:**

```yaml
# === Core Metadata ===
name: connector-name                    # Unique identifier (kebab-case)
display_name: "Connector Display Name"  # Human-readable name
description: "Brief description of the connector"
version: "1.0.0"                        # SemVer version
author: "Team Name"
license: "MIT"                          # Connector code license

# === Connector Type ===
ingestion_type: batch                   # batch | streaming | hybrid
supported_formats:                      # List of data formats
  - csv
  - json
  - parquet

# === Data Source Configuration ===
source:
  type: file                            # file | api | stream | database
  authentication:                       # Optional: auth requirements
    type: none                          # none | api_key | oauth2 | basic | certificate
    required_credentials: []            # List of required credential fields
  base_url: null                        # For API connectors

# === Rate Limiting ===
rate_limit:
  enabled: true
  type: per_source                      # per_source | global | per_user
  requests_per_second: 10
  burst_size: 50                        # Max burst tokens
  backoff_strategy: exponential         # exponential | linear | fixed
  max_retries: 3

# === Schema & Mapping ===
schema_mapping_file: schema_mapping.py
entity_types:                           # Entity types produced
  - Person
  - Organization
relationship_types:                     # Relationship types produced
  - AFFILIATED_WITH
  - WORKS_FOR

# === Testing ===
sample_data_file: sample.csv
golden_tests:
  enabled: true
  test_cases:
    - name: basic_ingestion
      input: __tests__/golden/input/sample.csv
      expected: __tests__/golden/expected/entities.json

# === Compliance & Governance ===
compliance:
  pii_detection: true                   # Enable PII scanning
  pii_fields:                           # Known PII fields
    - email
    - phone
  license_check: true                   # Enforce license registry
  data_classification: public           # public | internal | confidential | restricted
  retention_days: 365                   # Data retention policy

# === Observability ===
observability:
  metrics_enabled: true
  sli_targets:                          # Service Level Indicators
    availability: 0.99                  # 99% success rate
    latency_p95_ms: 5000                # 95th percentile < 5s
    throughput_min: 100                 # Min records/min
  slo_window_days: 30                   # SLO evaluation window
  alert_on_slo_breach: true

# === Resource Limits ===
resources:
  max_concurrent_requests: 10
  batch_size: 1000                      # Records per batch
  timeout_seconds: 300                  # Max processing time
  memory_limit_mb: 512

# === Dependencies ===
dependencies:
  python: ">=3.11"
  packages:
    - pandas>=2.0.0
    - requests>=2.31.0
```

**JSON Schema Validation:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "ingestion_type", "supported_formats", "schema_mapping_file"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$"
    },
    "ingestion_type": {
      "enum": ["batch", "streaming", "hybrid"]
    },
    "supported_formats": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  }
}
```

### 3. Schema Mapping Contract (schema_mapping.py)

**Function Signature:**

```python
from typing import List, Dict, Any, Tuple
from datetime import datetime

def map_{connector_name}_to_intelgraph(
    file_path: str,
    config: Dict[str, Any] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Maps source data to IntelGraph entities and relationships.

    Args:
        file_path: Path to the source data file
        config: Optional configuration dictionary

    Returns:
        Tuple of (entities, relationships)

    Raises:
        ValueError: If data format is invalid
        FileNotFoundError: If file doesn't exist
    """
    entities = []
    relationships = []

    # Implementation...

    return entities, relationships
```

**Entity Schema:**

```python
entity = {
    "type": "EntityType",           # Required: Person, Organization, etc.
    "properties": {
        "id": "unique-id",          # Required: Unique identifier
        "name": "Entity Name",      # Required: Display name
        "source": "connector-name", # Required: Data source
        "confidence": 0.95,         # Required: 0.0-1.0
        "created_at": "2025-11-20T00:00:00Z",
        # ... additional properties
    },
    "_metadata": {                   # Provenance metadata
        "ingestion_id": "uuid",
        "ingestion_timestamp": "2025-11-20T00:00:00Z",
        "connector_version": "1.0.0",
        "raw_record": {...}          # Optional: original record
    }
}
```

**Relationship Schema:**

```python
relationship = {
    "type": "RELATIONSHIP_TYPE",     # Required: ALL_CAPS_SNAKE_CASE
    "source_id": "entity-id-1",      # Required: Source entity ID
    "target_id": "entity-id-2",      # Required: Target entity ID
    "properties": {
        "confidence": 0.90,          # Required: 0.0-1.0
        "valid_from": "2025-01-01",  # Optional: temporal validity
        "valid_to": "2025-12-31",
        # ... additional properties
    },
    "_metadata": {                   # Provenance metadata
        "ingestion_id": "uuid",
        "ingestion_timestamp": "2025-11-20T00:00:00Z",
    }
}
```

### 4. Base Connector Class

**Use Existing Production BaseConnector:**

Location: `/home/user/summit/server/data-pipelines/connectors/base.py`

**Key Features:**
- ✅ Async/await support
- ✅ Connection lifecycle (connect, test, extract, disconnect)
- ✅ Built-in retry logic (tenacity)
- ✅ Statistics tracking (IngestionStats)
- ✅ Status management (ConnectorStatus enum)
- ✅ Batch processing
- ✅ Metadata enrichment
- ✅ Secure config handling

**Connector Implementation Pattern:**

```python
from server.data_pipelines.connectors.base import BaseConnector, ConnectorStatus
from typing import List, Dict, Any, AsyncIterator

class MyConnector(BaseConnector):
    """Custom connector implementation."""

    async def connect(self) -> None:
        """Establish connection to data source."""
        # Implementation

    async def disconnect(self) -> None:
        """Close connection to data source."""
        # Implementation

    async def test_connection(self) -> bool:
        """Test connection health."""
        # Implementation

    async def extract_data(self, batch_size: int = 1000) -> AsyncIterator[Dict[str, Any]]:
        """Extract data in batches."""
        # Implementation
        yield batch

    async def get_metadata(self) -> Dict[str, Any]:
        """Get connector metadata."""
        return {
            "connector_type": "my-connector",
            "version": "1.0.0",
            "capabilities": ["batch", "streaming"]
        }
```

### 5. Test Structure

#### 5.1 Unit Tests (test_mapping.py)

```python
import unittest
from connectors.{connector_name}.schema_mapping import map_{connector_name}_to_intelgraph

class TestSchemaMapping(unittest.TestCase):
    """Unit tests for schema mapping logic."""

    def test_basic_mapping(self):
        """Test basic entity and relationship mapping."""
        entities, relationships = map_{connector_name}_to_intelgraph(
            "connectors/{connector_name}/sample.csv"
        )

        self.assertGreater(len(entities), 0)
        self.assertIn("type", entities[0])
        self.assertIn("properties", entities[0])

    def test_pii_detection(self):
        """Test PII field detection and marking."""
        entities, _ = map_{connector_name}_to_intelgraph(
            "connectors/{connector_name}/__tests__/fixtures/pii_sample.csv"
        )

        # Verify PII fields are marked
        entity = entities[0]
        self.assertIn("_pii_fields", entity.get("_metadata", {}))

    def test_malformed_data(self):
        """Test handling of malformed data."""
        with self.assertRaises(ValueError):
            map_{connector_name}_to_intelgraph(
                "connectors/{connector_name}/__tests__/fixtures/malformed.csv"
            )
```

#### 5.2 End-to-End Tests (test_e2e.py)

```python
import unittest
from unittest.mock import Mock
from connectors.{connector_name}.schema_mapping import map_{connector_name}_to_intelgraph

class TestE2EIngestion(unittest.TestCase):
    """End-to-end ingestion pipeline tests."""

    def setUp(self):
        """Set up mock GraphDB client."""
        self.mock_db = Mock()
        self.mock_db.bulk_insert_entities = Mock(return_value=True)
        self.mock_db.bulk_insert_relationships = Mock(return_value=True)

    def test_full_pipeline(self):
        """Test complete ingestion pipeline."""
        # 1. Extract and map
        entities, relationships = map_{connector_name}_to_intelgraph(
            "connectors/{connector_name}/sample.csv"
        )

        # 2. Validate
        self.assertGreater(len(entities), 0)

        # 3. Load to mock DB
        self.mock_db.bulk_insert_entities(entities)
        self.mock_db.bulk_insert_relationships(relationships)

        # 4. Verify calls
        self.mock_db.bulk_insert_entities.assert_called_once()

    def test_rate_limiting(self):
        """Test rate limiting enforcement."""
        # Test rate limiter
        pass

    def test_license_check(self):
        """Test license registry integration."""
        # Test license enforcement
        pass
```

#### 5.3 Golden IO Tests (test_golden.py)

**Golden IO Test Framework:**

```python
import unittest
import json
import os
from pathlib import Path
from connectors.{connector_name}.schema_mapping import map_{connector_name}_to_intelgraph

class TestGoldenIO(unittest.TestCase):
    """Golden IO tests - validate against known good outputs."""

    def setUp(self):
        """Set up test paths."""
        self.golden_dir = Path(__file__).parent / "golden"
        self.input_dir = self.golden_dir / "input"
        self.expected_dir = self.golden_dir / "expected"

    def test_golden_basic_ingestion(self):
        """Golden test: basic ingestion."""
        # Load input
        input_file = self.input_dir / "basic_sample.csv"

        # Process
        entities, relationships = map_{connector_name}_to_intelgraph(str(input_file))

        # Load expected output
        with open(self.expected_dir / "basic_entities.json") as f:
            expected_entities = json.load(f)
        with open(self.expected_dir / "basic_relationships.json") as f:
            expected_relationships = json.load(f)

        # Compare (ignoring timestamps and UUIDs)
        self.assertEqual(len(entities), len(expected_entities))
        self.assertEqual(len(relationships), len(expected_relationships))

        # Validate entity types
        entity_types = {e["type"] for e in entities}
        expected_types = {e["type"] for e in expected_entities}
        self.assertEqual(entity_types, expected_types)

    def test_golden_pii_redaction(self):
        """Golden test: PII detection and redaction."""
        input_file = self.input_dir / "pii_sample.csv"
        entities, _ = map_{connector_name}_to_intelgraph(str(input_file))

        # Load expected
        with open(self.expected_dir / "pii_entities.json") as f:
            expected = json.load(f)

        # Verify PII fields marked
        for entity in entities:
            if "_metadata" in entity and "_pii_fields" in entity["_metadata"]:
                # PII should be detected
                self.assertIn("_pii_fields", entity["_metadata"])

    def test_golden_license_enforcement(self):
        """Golden test: license registry enforcement."""
        # Test that disallowed sources are blocked
        pass
```

**Golden Test Fixtures Structure:**

```
__tests__/golden/
├── input/
│   ├── basic_sample.csv
│   ├── pii_sample.csv
│   └── complex_sample.json
├── expected/
│   ├── basic_entities.json
│   ├── basic_relationships.json
│   ├── pii_entities.json
│   └── complex_entities.json
└── test_golden.py
```

### 6. Data Protection Impact Assessment (.dpia.yaml)

```yaml
# Data Protection Impact Assessment
# Automatically checked during connector registration

assessment:
  connector_name: "{connector-name}"
  version: "1.0.0"
  assessment_date: "2025-11-20"
  assessor: "Data Governance Team"

data_categories:
  - category: personal_identifiable_information
    present: true
    fields:
      - email
      - phone
      - full_name
  - category: sensitive_personal_data
    present: false
    fields: []
  - category: telemetry
    present: true
    fields:
      - ip_address
      - user_agent

lawful_basis:
  primary: legitimate_interest
  documentation: "Processing for security and fraud detection"
  consent_required: false

risk_analysis:
  - risk: unauthorized_access
    likelihood: low
    impact: high
    mitigation: "Encryption at rest and in transit"
  - risk: data_breach
    likelihood: low
    impact: high
    mitigation: "Access controls, audit logging"
  - risk: excessive_collection
    likelihood: medium
    impact: medium
    mitigation: "Minimal data collection, field filtering"

mitigations:
  - "Data encrypted in transit (TLS 1.3)"
  - "Data encrypted at rest (AES-256)"
  - "Access restricted to authorized personnel"
  - "Audit logging enabled"
  - "PII detection and redaction enabled"
  - "Data retention policy enforced (365 days)"

retention:
  default_days: 365
  legal_hold_supported: true
  deletion_method: secure_wipe

approvals:
  - role: dpo
    name: "Data Protection Officer"
    date: "2025-11-20"
    approved: true
  - role: security
    name: "Security Team Lead"
    date: "2025-11-20"
    approved: true
```

### 7. Observability Hooks

#### 7.1 Metrics Integration

```python
from ops.observability import record_prom_metric

# In connector code:
def _record_metrics(self, stats: IngestionStats):
    """Record connector metrics."""
    # Record basic counters
    record_prom_metric(
        "connector_records_processed",
        stats.records_processed,
        {"connector": self.name}
    )
    record_prom_metric(
        "connector_records_failed",
        stats.records_failed,
        {"connector": self.name}
    )

    # Record latency
    if stats.end_time:
        duration = (stats.end_time - stats.start_time).total_seconds()
        record_prom_metric(
            "connector_duration_seconds",
            duration,
            {"connector": self.name}
        )
```

#### 7.2 SLI/SLO Integration

```python
from server.data_pipelines.monitoring.sli_slo import SLICollector, SLOManager

# Create SLI collector
sli_collector = SLICollector()

# Register connector SLIs
sli_collector.register_sli(
    "connector_{name}_availability",
    "Connector availability (success rate)",
    "percentage"
)
sli_collector.register_sli(
    "connector_{name}_latency_p95",
    "95th percentile latency",
    "seconds"
)

# Record measurements
sli_collector.record("connector_{name}_availability", 99.5)
sli_collector.record("connector_{name}_latency_p95", 2.3)

# Define SLOs
slo_manager = SLOManager(sli_collector)
slo_manager.define_slo(
    "connector_{name}_availability_slo",
    "connector_{name}_availability",
    99.0,  # 99% availability
    30     # 30-day window
)
```

#### 7.3 Structured Logging

```python
import logging
import json

logger = logging.getLogger(f"connector.{connector_name}")

def log_ingestion_event(event_type: str, details: dict):
    """Log structured ingestion event."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "connector": connector_name,
        "event_type": event_type,
        "details": details
    }
    logger.info(json.dumps(log_entry))

# Usage:
log_ingestion_event("ingestion_started", {
    "source_file": "data.csv",
    "batch_size": 1000
})
```

### 8. PII Detection Integration

```python
from services.ingest.ingest.app.pii import detect_pii, apply_redaction

def _detect_and_mark_pii(entity: Dict[str, Any]) -> Dict[str, Any]:
    """Detect and mark PII fields in entity."""
    pii_fields = []

    for field, value in entity.get("properties", {}).items():
        if isinstance(value, str):
            detected_types = detect_pii(value)
            if detected_types:
                pii_fields.append({
                    "field": field,
                    "pii_types": detected_types
                })

    if pii_fields:
        if "_metadata" not in entity:
            entity["_metadata"] = {}
        entity["_metadata"]["_pii_fields"] = pii_fields

    return entity

def _apply_redaction_policy(entity: Dict[str, Any], policy: dict) -> Dict[str, Any]:
    """Apply redaction policy to entity."""
    if "_metadata" not in entity or "_pii_fields" not in entity["_metadata"]:
        return entity

    for pii_field in entity["_metadata"]["_pii_fields"]:
        field_name = pii_field["field"]
        pii_types = pii_field["pii_types"]

        if field_name in entity["properties"]:
            original_value = entity["properties"][field_name]
            redacted_value = apply_redaction(original_value, pii_types, policy)
            entity["properties"][field_name] = redacted_value

    return entity
```

### 9. License Registry Integration

```python
from typing import Optional

class LicenseRegistry:
    """Interface to license registry service."""

    def check_source_allowed(self, source: str) -> bool:
        """Check if data source is allowed by license."""
        # Implementation: call license registry API
        pass

    def get_license_terms(self, source: str) -> Optional[dict]:
        """Get license terms for data source."""
        # Implementation: retrieve license terms
        pass

    def record_usage(self, source: str, records_count: int) -> None:
        """Record data usage for license compliance."""
        # Implementation: log usage
        pass

# In connector:
def _check_license(self, source: str) -> None:
    """Check license before ingestion."""
    license_registry = LicenseRegistry()

    if not license_registry.check_source_allowed(source):
        raise PermissionError(
            f"Data source '{source}' is not allowed by license policy"
        )

    terms = license_registry.get_license_terms(source)
    if terms:
        logger.info(f"License terms: {terms}")
```

### 10. Rate Limiting Enforcement

```python
import asyncio
from datetime import datetime, timedelta
from collections import deque

class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, rate: float, burst: int):
        """
        Args:
            rate: Requests per second
            burst: Maximum burst size
        """
        self.rate = rate
        self.burst = burst
        self.tokens = burst
        self.last_update = datetime.utcnow()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            now = datetime.utcnow()
            elapsed = (now - self.last_update).total_seconds()

            # Add tokens based on elapsed time
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
            self.last_update = now

            # Wait if no tokens available
            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

# Usage in connector:
async def extract_with_rate_limit(self):
    """Extract data with rate limiting."""
    manifest = self._load_manifest()
    rate_limit_config = manifest.get("rate_limit", {})

    if rate_limit_config.get("enabled", False):
        limiter = RateLimiter(
            rate=rate_limit_config["requests_per_second"],
            burst=rate_limit_config["burst_size"]
        )

        async for record in self.extract_data():
            await limiter.acquire()
            yield record
    else:
        async for record in self.extract_data():
            yield record
```

---

## Priority Connectors Analysis

### Connector Selection Criteria

1. **Business Value**: High-impact data sources for intelligence analysis
2. **Complexity**: Mix of simple and complex to validate spec
3. **Coverage**: Different ingestion types (batch, streaming, API)
4. **Gaps**: Fill missing connectors from GA target list

### Priority 1: CISA KEV (Known Exploited Vulnerabilities)

**Rationale:**
- ✅ High security value (CVE vulnerability catalog)
- ✅ Missing from current connector set
- ✅ Publicly available API (no auth required)
- ✅ Simple batch ingestion (good validation of spec)
- ✅ Clear entity model (Vulnerability entity type)

**Complexity**: ⭐⭐☆☆☆ (Low-Medium)

**Data Source:**
- URL: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
- Format: JSON
- Update Frequency: Daily
- License: Public Domain (US Government)

**Entity Model:**
```yaml
entities:
  - type: Vulnerability
    properties:
      - cve_id (CVE-YYYY-NNNN)
      - vendor_project
      - product
      - vulnerability_name
      - date_added
      - short_description
      - required_action
      - due_date
      - known_ransomware_use
```

**Implementation Complexity:**
- Simple HTTP GET request
- Well-structured JSON response
- No authentication required
- No rate limiting needed (daily updates)
- Straightforward mapping to Vulnerability entities

### Priority 2: DNS/WHOIS Connector

**Rationale:**
- ✅ Missing from current connector set
- ✅ Essential for infrastructure analysis
- ✅ Moderate complexity (validates API + batch patterns)
- ✅ Multiple entity types (Domain, Organization, Person)
- ✅ Rate limiting required (good test of rate limiter)

**Complexity**: ⭐⭐⭐☆☆ (Medium)

**Data Sources:**
- DNS: Custom DNS resolver (dnspython)
- WHOIS: WHOIS API (requires rate limiting)
- Formats: DNS records, WHOIS text
- License: Varies by registrar

**Entity Model:**
```yaml
entities:
  - type: Domain
    properties:
      - domain_name
      - registrar
      - creation_date
      - expiration_date
      - nameservers
  - type: Organization
    properties:
      - name
      - registrant_org
  - type: Person
    properties:
      - name
      - email (PII)
      - phone (PII)

relationships:
  - Domain -> REGISTERED_TO -> Organization
  - Person -> MANAGES -> Domain
```

**Implementation Complexity:**
- DNS lookups (A, AAAA, MX, TXT, NS records)
- WHOIS parsing (varies by registrar)
- PII detection required (email, phone)
- Rate limiting required (WHOIS servers)
- Error handling (domains may not exist)

### Priority 3: MISP (Python Implementation)

**Rationale:**
- ⚠️ TypeScript version exists, need Python version for consistency
- ✅ High value for threat intelligence
- ✅ Complex API (good validation of API connector pattern)
- ✅ Multiple entity types and relationships
- ✅ Streaming + batch support

**Complexity**: ⭐⭐⭐⭐☆ (High)

**Data Source:**
- API: MISP REST API
- Format: JSON (events, attributes, objects, tags)
- Authentication: API key
- Rate Limiting: Server-dependent

**Entity Model:**
```yaml
entities:
  - type: Threat
  - type: Indicator
  - type: ThreatActor
  - type: Campaign
  - type: Vulnerability

relationships:
  - Threat -> HAS_INDICATOR -> Indicator
  - ThreatActor -> USES -> Campaign
  - Campaign -> EXPLOITS -> Vulnerability
```

**Implementation Complexity:**
- Full MISP API coverage (events, attributes, objects, tags)
- Complex nested data structures
- IOC enrichment and caching
- Authentication and API key management
- Search query building
- Event-driven architecture

---

## Implementation Plan: CISA KEV Connector

### Overview

**Goal**: Implement production-ready CISA KEV connector as reference implementation demonstrating all GA spec requirements.

**Timeline**: 2-3 days
**Complexity**: Low-Medium
**Business Value**: High

### Phase 1: Directory Structure & Manifest (2 hours)

**Tasks:**
1. Create connector directory structure
2. Write manifest.yaml with all required fields
3. Create .dpia.yaml assessment
4. Write README.md documentation

**Deliverables:**
```
connectors/cisa-kev/
├── manifest.yaml
├── .dpia.yaml
├── README.md
├── schema_mapping.py (stub)
├── __tests__/
│   ├── golden/
│   │   ├── input/
│   │   └── expected/
│   ├── test_mapping.py
│   ├── test_e2e.py
│   └── test_golden.py
└── sample.json
```

### Phase 2: Schema Mapping Implementation (4 hours)

**Tasks:**
1. Implement `map_cisa_kev_to_intelgraph()` function
2. Define Vulnerability entity schema
3. Add metadata enrichment
4. Integrate PII detection (none expected, but validate)
5. Add error handling

**Mapping Logic:**
```python
KEV Entry → Vulnerability Entity
- cveID → properties.cve_id
- vendorProject → properties.vendor_project
- product → properties.product
- vulnerabilityName → properties.name
- dateAdded → properties.discovered_date
- shortDescription → properties.description
- requiredAction → properties.remediation
- dueDate → properties.due_date
- knownRansomwareUse → properties.ransomware_use
```

**Deliverables:**
- `schema_mapping.py` with complete implementation
- Sample output entities

### Phase 3: Connector Implementation (4 hours)

**Tasks:**
1. Extend BaseConnector class
2. Implement async data fetching from CISA API
3. Add retry logic with exponential backoff
4. Implement caching (daily updates)
5. Add observability hooks

**Key Methods:**
```python
class CISAKEVConnector(BaseConnector):
    async def connect(self) -> None
    async def test_connection(self) -> bool
    async def extract_data(self) -> AsyncIterator[Dict]
    async def get_metadata(self) -> Dict
```

**Deliverables:**
- `connector.py` with full implementation
- Integration with BaseConnector

### Phase 4: Testing Suite (6 hours)

**Tasks:**
1. Write unit tests for schema mapping
2. Write E2E pipeline tests
3. Create golden IO test fixtures
4. Implement golden IO tests
5. Add PII detection tests (validate no PII)
6. Add license check tests

**Test Coverage:**
- ✅ Schema mapping unit tests
- ✅ E2E ingestion pipeline
- ✅ Golden IO validation
- ✅ Error handling
- ✅ Rate limiting (N/A for CISA)
- ✅ PII detection
- ✅ License enforcement

**Deliverables:**
- Complete test suite with >90% coverage
- Golden test fixtures

### Phase 5: Compliance Integration (3 hours)

**Tasks:**
1. Integrate PII detection hooks
2. Add license registry checks
3. Implement DPIA validation
4. Add telemetry and SLI/SLO metrics
5. Configure observability dashboards

**Deliverables:**
- PII detection integrated
- License checks enforced
- DPIA validated
- Metrics exposed

### Phase 6: Documentation (2 hours)

**Tasks:**
1. Complete README with usage examples
2. Add architecture notes
3. Document deployment steps
4. Create troubleshooting guide

**Deliverables:**
- Complete documentation
- Usage examples
- Deployment guide

---

## Golden IO Test Framework

### Framework Architecture

```
tests/
├── golden/
│   ├── framework/
│   │   ├── __init__.py
│   │   ├── runner.py           # Test runner
│   │   ├── comparator.py       # Output comparison
│   │   └── fixtures.py         # Fixture loader
│   ├── connectors/
│   │   ├── cisa_kev/
│   │   │   ├── input/
│   │   │   │   └── sample.json
│   │   │   ├── expected/
│   │   │   │   └── entities.json
│   │   │   └── test_golden.py
│   │   └── ...
│   └── README.md
└── pytest.ini
```

### Golden Test Runner

```python
# tests/golden/framework/runner.py

import json
import pytest
from pathlib import Path
from typing import List, Dict, Any, Tuple
from deepdiff import DeepDiff

class GoldenTestRunner:
    """Framework for running golden IO tests."""

    def __init__(self, connector_name: str):
        self.connector_name = connector_name
        self.base_path = Path(__file__).parent.parent / "connectors" / connector_name
        self.input_path = self.base_path / "input"
        self.expected_path = self.base_path / "expected"

    def load_input(self, filename: str) -> str:
        """Load input fixture."""
        return str(self.input_path / filename)

    def load_expected(self, filename: str) -> Dict[str, Any]:
        """Load expected output."""
        with open(self.expected_path / filename) as f:
            return json.load(f)

    def compare_entities(
        self,
        actual: List[Dict],
        expected: List[Dict],
        ignore_fields: List[str] = None
    ) -> Tuple[bool, str]:
        """
        Compare actual vs expected entities.

        Args:
            actual: Actual entities
            expected: Expected entities
            ignore_fields: Fields to ignore (e.g., timestamps, UUIDs)

        Returns:
            Tuple of (match: bool, diff: str)
        """
        if ignore_fields is None:
            ignore_fields = [
                "_metadata.ingestion_timestamp",
                "_metadata.ingestion_id"
            ]

        # Sort for consistent comparison
        actual_sorted = sorted(actual, key=lambda e: e.get("properties", {}).get("id", ""))
        expected_sorted = sorted(expected, key=lambda e: e.get("properties", {}).get("id", ""))

        diff = DeepDiff(
            expected_sorted,
            actual_sorted,
            ignore_order=True,
            exclude_paths=ignore_fields
        )

        if diff:
            return False, diff.to_json()
        return True, ""

    def assert_golden(
        self,
        actual_entities: List[Dict],
        actual_relationships: List[Dict],
        expected_entities_file: str,
        expected_relationships_file: str = None
    ):
        """Assert that actual output matches golden fixtures."""
        # Load expected
        expected_entities = self.load_expected(expected_entities_file)

        # Compare entities
        match, diff = self.compare_entities(actual_entities, expected_entities)
        assert match, f"Entity mismatch:\n{diff}"

        # Compare relationships if provided
        if expected_relationships_file:
            expected_relationships = self.load_expected(expected_relationships_file)
            match, diff = self.compare_entities(actual_relationships, expected_relationships)
            assert match, f"Relationship mismatch:\n{diff}"
```

### CI Integration

```yaml
# .github/workflows/golden-tests.yml

name: Golden IO Tests
on:
  pull_request:
    paths:
      - 'connectors/**'
      - 'tests/golden/**'

jobs:
  golden-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest deepdiff

      - name: Run golden IO tests
        run: |
          pytest tests/golden/ -v --tb=short

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: golden-test-results
          path: test-results/
```

---

## Acceptance Criteria

### Connector-Level Acceptance

Each GA connector must satisfy:

- [ ] **Manifest Complete**: All required manifest fields present and valid
- [ ] **Schema Mapping**: Implements standard mapping contract
- [ ] **Sample Data**: Includes representative sample data
- [ ] **Unit Tests**: Schema mapping unit tests with >90% coverage
- [ ] **E2E Tests**: Full pipeline tests with mock database
- [ ] **Golden IO Tests**: At least 3 golden test cases
- [ ] **PII Detection**: Integrated and tested
- [ ] **License Check**: Enforces license registry
- [ ] **DPIA**: Complete assessment document
- [ ] **Rate Limiting**: Implemented and tested (if applicable)
- [ ] **Observability**: Metrics, logging, and SLI/SLO configured
- [ ] **Documentation**: Complete README with examples
- [ ] **CI/CD**: All tests passing in CI

### System-Level Acceptance

The Data Intake system must satisfy:

- [ ] **10+ GA Connectors**: At least 10 connectors meeting all criteria
- [ ] **Golden Test Framework**: Operational and integrated in CI
- [ ] **Connector Registry**: Catalog of all connectors with metadata
- [ ] **Unified Base Class**: All connectors extend BaseConnector
- [ ] **PII Integration**: PII detection in all relevant connectors
- [ ] **License Enforcement**: License registry operational
- [ ] **Telemetry Sanity**: SLI/SLO monitoring for all connectors
- [ ] **Documentation**: Connector developer guide published
- [ ] **Ingest Wizard**: Basic UI for connector configuration (Phase 2)
- [ ] **ETL Assistant**: Guided schema mapping (Phase 2)

### CISA KEV Acceptance (Reference Implementation)

- [ ] Fetches data from CISA API successfully
- [ ] Maps all KEV fields to Vulnerability entities
- [ ] Handles API errors gracefully
- [ ] Caches data appropriately (daily updates)
- [ ] Passes all unit tests
- [ ] Passes E2E pipeline tests
- [ ] Passes 3+ golden IO tests
- [ ] PII detection runs (validates no PII)
- [ ] License check confirms public domain
- [ ] DPIA approved
- [ ] Metrics exposed and queryable
- [ ] Documentation complete
- [ ] CI pipeline green

---

## Next Steps

### Immediate (Week 1-2)

1. **Implement CISA KEV connector** (reference implementation)
2. **Build golden IO test framework**
3. **Create connector registry/catalog**
4. **Integrate PII detection** into BaseConnector
5. **Add license registry hooks** to BaseConnector

### Short-term (Week 3-4)

6. **Implement DNS/WHOIS connector**
7. **Implement MISP Python connector**
8. **Retrofit existing connectors** with golden tests
9. **Add rate limiting** to BaseConnector
10. **Complete DPIA** for all connectors

### Medium-term (Month 2)

11. **Complete remaining GA connectors** (GDELT, Slack/Jira, full S3, HTTP)
12. **Build ingest wizard UI**
13. **Build ETL assistant** (schema mapping wizard)
14. **Create connector developer guide**
15. **Publish connector catalog**

---

## Appendix: References

### Existing Documentation

- `/home/user/summit/docs/modules/epic-connectors.md` - Epic requirements
- `/home/user/summit/docs/modules/A5-connectors-10ga.md` - Acceptance criteria
- `/home/user/summit/docs/CONNECTORS.md` - High-level contract
- `/home/user/summit/docs/connectors_sdk.md` - SDK implementation
- `/home/user/summit/docs/modules/data-intake-preparation-set-a.md` - Module requirements
- `/home/user/summit/docs/security/DPIA.md` - DPIA template

### Existing Code Patterns

- `/home/user/summit/server/data-pipelines/connectors/base.py` - Production BaseConnector
- `/home/user/summit/server/data-pipelines/monitoring/sli_slo.py` - SLI/SLO framework
- `/home/user/summit/ops/observability.py` - Metrics system
- `/home/user/summit/services/ingest/ingest/app/pii.py` - PII detection
- `/home/user/summit/packages/connectors/` - SDK reference

### External References

- CISA KEV API: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- MISP API: https://www.misp-project.org/openapi/
- STIX/TAXII: https://oasis-open.github.io/cti-documentation/

---

**Document Status**: Proposed
**Next Review**: After CISA KEV implementation
**Owner**: Data Intake Team
**Version**: 1.0.0
