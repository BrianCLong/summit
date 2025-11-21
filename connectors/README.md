# IntelGraph Connector SDK

A normalized SDK for building data connectors with built-in PII detection, license enforcement, rate limiting, and lineage tracking.

## Overview

The Connector SDK provides a standardized framework for ingesting data from various sources into IntelGraph. All connectors conform to a unified manifest schema and implement consistent handling of:

- **PII Detection & Redaction** - Automatic detection and policy-based handling of personally identifiable information
- **License Enforcement** - Field-level blocking based on license restrictions
- **Rate Limiting** - Configurable rate limits with exponential backoff
- **Lineage Tracking** - Automatic recording of data provenance
- **Quality Metrics** - Built-in tracking of ingestion statistics

## Quick Start

### Using the Ingestion Wizard (Recommended)

The easiest way to ingest data is using the interactive wizard:

```bash
cd ingestion
python wizard.py
```

The wizard will:
1. Guide you through connector selection
2. Propose field mappings automatically
3. Show PII flags and ask for user decisions
4. Display license restrictions and blocked fields
5. Run ingestion with full lineage tracking

### Using a Connector Directly

```python
from connectors.csv_connector.connector import CSVConnector

# Create connector instance
connector = CSVConnector("path/to/manifest.yaml", "path/to/data.csv")

# Run ingestion
results = connector.run()

# Access results
print(f"Processed: {results['stats']['records_processed']}")
print(f"PII detections: {results['stats']['pii_detections']}")
```

## Sample Connectors

### 1. CSV Connector

Batch ingestion of CSV/TSV files with automatic PII detection.

**Features:**
- Large file support (up to 1GB)
- Unicode and special character handling
- Batch processing (1000 records/batch)
- Automatic entity type inference

**Usage:**
```bash
cd connectors/csv_connector
python connector.py
```

**Manifest:** `connectors/csv_connector/manifest.yaml`

### 2. RSS/Atom Connector

Streaming ingestion of news feeds and threat intelligence from RSS/Atom sources.

**Features:**
- 60 feeds/hour rate limit
- Full-text extraction
- Deduplication (24-hour window)
- NLP entity extraction

**Preconfigured Feeds:**
- Krebs on Security
- SANS ISC
- Threatpost
- Reuters Technology
- BBC Technology

**Manifest:** `connectors/rss_news_connector/manifest.yaml`

### 3. STIX/TAXII Connector

Streaming ingestion of threat intelligence from STIX 2.x/TAXII 2.x servers.

**Features:**
- STIX 2.1 compliant
- TLP marking support
- Malware payload blocking
- Conservative rate limiting (2 req/min)

**Supported Objects:**
- Indicators
- Malware
- Threat Actors
- Attack Patterns
- Vulnerabilities
- Campaigns

**Manifest:** `connectors/stix_taxii_connector/manifest.yaml`

## SDK Architecture

### Manifest Schema

All connectors must include a `manifest.yaml` file conforming to the SDK schema:

```yaml
name: my-connector
description: Description of the connector
version: 1.0.0
author: Your Name
ingestion_type: batch  # or streaming, hybrid

# Required fields
supported_formats: [csv, json]
schema_mapping_file: schema_mapping.py
sample_data_file: sample.csv
golden_io_tests: [test_connector.py]

# Rate limiting (required)
rate_limit:
  requests_per_hour: 1000
  burst_limit: 10
  backoff_strategy: exponential
  max_retries: 3

# PII handling (required)
pii_flags:
  - field_name: email
    description: Email addresses
    severity: high
    redaction_policy: redact

# License (required)
license:
  type: MIT
  classification: open-source
  attribution_required: false
  allowed_use_cases: [research, analysis]
  blocked_fields: []

# Lineage (recommended)
lineage:
  enabled: true
  source_system: my-source
  data_classification: internal
```

See `SDK_MANIFEST_SCHEMA.yaml` for full schema specification.

### Base Connector Class

Extend `BaseConnector` to implement a new connector:

```python
from sdk.base import BaseConnector

class MyConnector(BaseConnector):
    def fetch_raw_data(self):
        """Yield raw data items from source."""
        # Implement data fetching logic
        yield {"field1": "value1", "field2": "value2"}

    def map_to_entities(self, raw_data):
        """Map raw data to IntelGraph entities."""
        entities = [{
            "type": "Entity",
            "properties": raw_data
        }]
        relationships = []
        return entities, relationships
```

The base class automatically handles:
- Rate limiting
- PII detection and redaction
- License enforcement
- Lineage creation
- Statistics tracking

### PII Detection

The SDK includes automatic PII detection for:
- Email addresses
- Phone numbers
- IP addresses
- Social Security Numbers
- Credit card numbers
- Person names

**Redaction Policies:**
- `allow` - Pass through without modification
- `redact` - Mask sensitive portions (e.g., `jo****@example.com`)
- `block` - Remove field entirely
- `prompt` - Ask user during ingestion wizard

### License Enforcement

Connectors can specify blocked fields that cannot be ingested due to license restrictions:

```yaml
license:
  blocked_fields:
    - field_name: credit_card
      reason: PCI-DSS compliance prohibits storing card data
      alternative: Use tokenized payment references
```

During ingestion, blocked fields are:
1. Removed from the data
2. Logged with the reason
3. Displayed to the user with suggested alternatives

### Rate Limiting

Rate limits prevent overwhelming data sources:

```python
rate_limit:
  requests_per_hour: 100    # Max 100 requests/hour
  requests_per_minute: 2    # Max 2 requests/minute
  burst_limit: 5            # Max 5 rapid requests
  backoff_strategy: exponential  # Retry with exponential backoff
  max_retries: 3            # Max 3 retry attempts
```

**Backoff Strategies:**
- `exponential` - 2^n seconds (recommended)
- `linear` - n*2 seconds
- `fixed` - 5 seconds

### Lineage Tracking

All ingested data includes lineage metadata stored in the provenance ledger:

```python
{
  "connector": "csv-connector",
  "timestamp": 1234567890,
  "source_system": "csv-file-upload",
  "classification": "internal",
  "entities_count": 100,
  "tx_id": "tx_abc123..."  # Provenance receipt ID
}
```

Query lineage using the provenance API:
```bash
curl http://localhost:8080/export/prov
```

## Golden I/O Tests

Each connector includes golden I/O tests that verify:
- Correct entity mapping
- PII detection and redaction
- License field blocking
- Edge case handling

Run tests:
```bash
cd connectors
python -m pytest __tests__/test_csv_connector.py -v
python -m pytest __tests__/test_csv_edge_cases.py -v
python -m pytest __tests__/test_stix_parsing.py -v
```

## Acceptance Criteria

✅ **Map CSV → entities in ≤10 minutes**
- CSV connector processes 1000+ records/min
- Tested with files up to 1GB

✅ **PII flags visible**
- Wizard displays all PII fields with severity
- User prompted for decisions on `prompt` policy fields
- Redaction applied automatically

✅ **Blocked fields show license reason**
- License violations logged and displayed
- Reasons shown with suggested alternatives
- Fields removed before storage

✅ **Lineage recorded**
- Every ingestion creates provenance receipt
- Stored in immutable ledger with TX ID
- Includes full metadata trail

## Development Guide

### Creating a New Connector

1. **Create connector directory:**
   ```bash
   mkdir connectors/my_connector
   ```

2. **Create manifest.yaml:**
   ```bash
   cp connectors/SDK_MANIFEST_SCHEMA.yaml connectors/my_connector/manifest.yaml
   # Edit manifest with your connector details
   ```

3. **Create schema_mapping.py:**
   ```python
   def map_data_to_intelgraph(raw_data):
       entities = []
       relationships = []
       # Implement mapping logic
       return entities, relationships
   ```

4. **Create connector.py:**
   ```python
   from sdk.base import BaseConnector

   class MyConnector(BaseConnector):
       def fetch_raw_data(self):
           # Implement fetch logic
           pass

       def map_to_entities(self, raw_data):
           # Implement mapping logic
           pass
   ```

5. **Add sample data:**
   ```bash
   # Create sample.csv, sample.json, etc.
   ```

6. **Write golden tests:**
   ```bash
   # Create __tests__/test_my_connector.py
   ```

7. **Validate manifest:**
   ```python
   from sdk.validator import validate_manifest

   report = validate_manifest("connectors/my_connector/manifest.yaml")
   if report['valid']:
       print("✓ Manifest valid!")
   ```

8. **Test with wizard:**
   ```bash
   cd ingestion
   python wizard.py
   ```

### Manifest Validation

Validate connector manifest compliance:

```python
from connectors.sdk.validator import validate_manifest

report = validate_manifest("path/to/manifest.yaml")

if report['valid']:
    print("Manifest is valid!")
else:
    for error in report['errors']:
        print(f"Error: {error}")
    for warning in report['warnings']:
        print(f"Warning: {warning}")
```

## API Reference

### BaseConnector

**Methods:**
- `__init__(manifest_path: str)` - Initialize connector
- `fetch_raw_data() -> Iterator[Any]` - Fetch raw data (abstract)
- `map_to_entities(raw_data) -> tuple[List[Dict], List[Dict]]` - Map to entities (abstract)
- `process_record(raw_data) -> Optional[Dict]` - Process single record through pipeline
- `run() -> Dict` - Run full ingestion pipeline
- `get_connector_info() -> Dict` - Get connector metadata

**Attributes:**
- `manifest: Dict` - Parsed manifest configuration
- `rate_limiter: RateLimiter` - Rate limiter instance
- `pii_detector: PIIDetector` - PII detector instance
- `license_enforcer: LicenseEnforcer` - License enforcer instance
- `stats: Dict` - Ingestion statistics

### RateLimiter

**Methods:**
- `acquire() -> bool` - Acquire rate limit token
- `wait_if_needed()` - Block until request allowed
- `get_current_usage() -> Dict` - Get usage statistics

### PIIDetector

**Methods:**
- `scan_value(value, field_name) -> Dict` - Scan value for PII
- `apply_redaction_policy(value, field_name) -> tuple` - Apply redaction
- `process_record(record) -> tuple` - Process full record
- `get_pii_report() -> Dict` - Get detection report

### LicenseEnforcer

**Methods:**
- `check_use_case(use_case) -> bool` - Check if use case allowed
- `filter_blocked_fields(record) -> tuple` - Remove blocked fields
- `get_license_summary() -> Dict` - Get license terms
- `check_field_allowed(field_name) -> tuple` - Check field permission

## Troubleshooting

### "Manifest validation failed"
- Check that all required fields are present in manifest.yaml
- Verify rate_limit, pii_flags, and license sections are properly formatted
- Use `SDK_MANIFEST_SCHEMA.yaml` as reference

### "Rate limit exceeded"
- Reduce `requests_per_hour` or `requests_per_minute` in manifest
- Increase `max_retries` to allow more backoff attempts
- Use `burst_limit` to control rapid request patterns

### "PII detection false positives"
- Adjust PII patterns in manifest `pii_flags`
- Set `redaction_policy: allow` for fields that aren't actually PII
- Add custom patterns to `PIIDetector.PATTERNS`

### "Lineage not recorded"
- Ensure `lineage.enabled: true` in manifest
- Check that provenance service is running
- Verify write permissions for lineage storage

## Performance Tips

1. **Batch Processing**: Use larger batch sizes (1000+) for CSV files
2. **Rate Limiting**: Set conservative limits to avoid throttling
3. **PII Scanning**: Disable PII detection for trusted internal data
4. **Parallel Processing**: Run multiple connector instances for different sources

## License

MIT License - See LICENSE file for details
