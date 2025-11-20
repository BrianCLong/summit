# CISA KEV Connector

**Version**: 1.0.0
**Status**: ✅ GA Ready
**Author**: IntelGraph Data Intake Team

## Overview

The CISA KEV (Known Exploited Vulnerabilities) connector ingests vulnerability data from the Cybersecurity and Infrastructure Security Agency's authoritative catalog of vulnerabilities that are known to be actively exploited in the wild.

This connector serves as a **reference implementation** demonstrating all GA-level requirements for IntelGraph connectors, including:

- ✅ Complete manifest with all required fields
- ✅ Schema mapping with full entity model
- ✅ Golden IO tests
- ✅ PII detection integration
- ✅ License enforcement
- ✅ DPIA assessment
- ✅ Observability hooks (metrics, logging, SLI/SLO)
- ✅ Comprehensive documentation

## Data Source

- **URL**: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
- **Format**: JSON
- **Update Frequency**: Daily
- **License**: US Government - Public Domain
- **Authentication**: None required

## Entity Model

### Vulnerability Entity

```yaml
type: Vulnerability
properties:
  id: "{cve_id}"                          # CVE-2023-12345
  cve_id: "CVE-YYYY-NNNNN"                # Official CVE identifier
  name: "Vulnerability short name"         # e.g., "Apache Log4j RCE"
  vendor_project: "Vendor/Project name"    # e.g., "Apache"
  product: "Product name"                  # e.g., "Log4j"
  vulnerability_name: "Official CVE name"
  date_added: "YYYY-MM-DD"                # Date added to KEV catalog
  short_description: "Brief description"
  required_action: "CISA required action"  # Remediation guidance
  due_date: "YYYY-MM-DD"                  # Remediation deadline (if applicable)
  known_ransomware_use: true|false        # Flag for ransomware association
  source: "cisa-kev"
  confidence: 1.0                         # High confidence (authoritative source)
  severity: "critical|high|medium|low"    # Inferred from context

  # Additional metadata
  catalog_version: "2025.11.20"
  catalog_count: 1234
```

## Installation

### Prerequisites

- Python >= 3.11
- Access to internet (https://www.cisa.gov)

### Dependencies

```bash
pip install httpx>=0.27.0 pydantic>=2.0.0
```

## Usage

### Basic Usage

```python
from connectors.cisa_kev.connector import CISAKEVConnector
from connectors.cisa_kev.schema_mapping import map_cisa_kev_to_intelgraph

# Using schema mapping directly
entities, relationships = map_cisa_kev_to_intelgraph()

print(f"Ingested {len(entities)} vulnerabilities")

# Using connector class
async def ingest_kev():
    connector = CISAKEVConnector(config={})

    await connector.connect()

    if await connector.test_connection():
        async for batch in connector.extract_data(batch_size=100):
            # Process batch
            print(f"Batch: {len(batch)} vulnerabilities")

    await connector.disconnect()
```

### Filter by Ransomware

```python
# Filter for vulnerabilities with known ransomware use
entities, _ = map_cisa_kev_to_intelgraph()
ransomware_vulns = [
    e for e in entities
    if e["properties"].get("known_ransomware_use", False)
]

print(f"Found {len(ransomware_vulns)} ransomware-associated vulnerabilities")
```

### Integration with Pipeline

```python
from server.data_pipelines.orchestrator import PipelineOrchestrator

orchestrator = PipelineOrchestrator()

# Run full ingestion pipeline
stats = await orchestrator.run_connector("cisa-kev")

print(f"Records processed: {stats.records_processed}")
print(f"Records failed: {stats.records_failed}")
```

## Configuration

The connector uses the manifest.yaml for configuration. No additional configuration is required for basic usage.

### Advanced Configuration

```python
config = {
    "cache_enabled": True,
    "cache_ttl_hours": 24,
    "batch_size": 100,
    "include_metadata": True,
}

connector = CISAKEVConnector(config=config)
```

## Testing

### Run All Tests

```bash
# Run unit tests
pytest connectors/cisa-kev/__tests__/test_mapping.py -v

# Run E2E tests
pytest connectors/cisa-kev/__tests__/test_e2e.py -v

# Run golden IO tests
pytest connectors/cisa-kev/__tests__/test_golden.py -v

# Run all tests with coverage
pytest connectors/cisa-kev/__tests__/ -v --cov=connectors.cisa_kev
```

### Golden Tests

Golden IO tests validate the complete ingestion pipeline against known-good outputs:

```bash
pytest connectors/cisa-kev/__tests__/test_golden.py::TestGoldenIO::test_golden_basic_ingestion
```

Test fixtures are located in `__tests__/golden/`:
- `input/` - Sample input data
- `expected/` - Expected output entities/relationships

## Compliance

### PII Detection

This connector does not process any personal identifiable information (PII). All data is public domain vulnerability metadata.

### License

- **Connector Code**: MIT License
- **Data Source**: US Government - Public Domain
- **Terms**: https://www.cisa.gov/privacy-policy

### DPIA

A complete Data Protection Impact Assessment (DPIA) is available in `.dpia.yaml`. Key findings:

- ✅ No PII collection
- ✅ Public domain data
- ✅ Low risk profile
- ✅ Standard security controls sufficient

## Observability

### Metrics

The connector exposes the following Prometheus metrics:

```
# Success rate
connector_cisa_kev_availability{status="success|failure"}

# Latency
connector_cisa_kev_latency_p95_seconds

# Throughput
connector_cisa_kev_records_processed_total
connector_cisa_kev_records_failed_total

# Data freshness
connector_cisa_kev_last_successful_ingest_timestamp
```

### SLI/SLO

Configured SLIs:
- **Availability**: 99% success rate over 30 days
- **Latency**: 95th percentile < 10 seconds
- **Throughput**: Minimum 1000 records/minute
- **Freshness**: Data < 24 hours old

### Logging

Structured JSON logs are emitted for all operations:

```json
{
  "timestamp": "2025-11-20T12:00:00Z",
  "connector": "cisa-kev",
  "event_type": "ingestion_started",
  "details": {
    "catalog_version": "2025.11.20",
    "expected_count": 1234
  }
}
```

## Monitoring & Alerting

### Health Check

```bash
curl http://localhost:8000/connectors/cisa-kev/health
```

Response:
```json
{
  "status": "healthy",
  "last_successful_ingest": "2025-11-20T12:00:00Z",
  "catalog_version": "2025.11.20",
  "vulnerability_count": 1234
}
```

### Common Issues

#### API Unavailable

**Symptom**: Connection timeout or HTTP 503
**Solution**: CISA API may be temporarily unavailable. Connector will retry with exponential backoff (3 attempts). Check https://www.cisa.gov for service status.

#### Stale Data

**Symptom**: `data_freshness` SLI breach
**Solution**: Check CISA update schedule. Catalog is typically updated daily but may lag during holidays/weekends.

#### Parse Errors

**Symptom**: Schema validation failures
**Solution**: CISA may have updated their JSON schema. Check connector version compatibility and update if needed.

## Development

### Project Structure

```
connectors/cisa-kev/
├── manifest.yaml              # Connector configuration
├── .dpia.yaml                 # Data Protection Impact Assessment
├── README.md                  # This file
├── schema_mapping.py          # Entity mapping logic
├── connector.py               # Connector implementation
├── sample.json                # Sample KEV data
├── __init__.py
└── __tests__/
    ├── test_mapping.py        # Schema mapping tests
    ├── test_e2e.py            # End-to-end tests
    ├── test_golden.py         # Golden IO tests
    └── golden/
        ├── input/
        │   ├── sample_kev.json
        │   ├── full_catalog.json
        │   └── ransomware_sample.json
        └── expected/
            ├── entities.json
            ├── full_entities.json
            └── ransomware_entities.json
```

### Adding New Test Cases

1. Add input fixture to `__tests__/golden/input/`
2. Generate expected output (review manually)
3. Save expected output to `__tests__/golden/expected/`
4. Add test case to manifest.yaml `golden_tests` section
5. Implement test in `test_golden.py`

### Extending the Connector

To add custom enrichment:

```python
from connectors.cisa_kev.schema_mapping import map_cisa_kev_to_intelgraph

def map_with_cvss(file_path: str = None):
    """Extended mapping with CVSS scores."""
    entities, relationships = map_cisa_kev_to_intelgraph(file_path)

    # Add CVSS enrichment
    for entity in entities:
        cve_id = entity["properties"]["cve_id"]
        cvss_score = fetch_cvss_score(cve_id)  # External API
        entity["properties"]["cvss_score"] = cvss_score

    return entities, relationships
```

## API Reference

### Functions

#### `map_cisa_kev_to_intelgraph(file_path: str = None) -> Tuple[List[Dict], List[Dict]]`

Maps CISA KEV data to IntelGraph entities.

**Args**:
- `file_path` (str, optional): Path to local KEV JSON file. If None, fetches from CISA API.

**Returns**:
- Tuple of (entities, relationships)

**Raises**:
- `ValueError`: If JSON format is invalid
- `httpx.HTTPError`: If API request fails

### Classes

#### `CISAKEVConnector(BaseConnector)`

Production connector implementation.

**Methods**:
- `connect() -> None`: Establish connection
- `disconnect() -> None`: Close connection
- `test_connection() -> bool`: Test connectivity
- `extract_data(batch_size: int) -> AsyncIterator[Dict]`: Extract data in batches
- `get_metadata() -> Dict`: Get connector metadata

## Performance

**Typical Performance**:
- Full catalog ingestion: ~5-10 seconds
- Average throughput: ~200 vulnerabilities/second
- Memory usage: ~50MB for full catalog
- API latency: 1-3 seconds (depends on CISA infrastructure)

**Optimization Tips**:
- Enable caching for repeated ingests
- Use batch processing (default: 100 records/batch)
- Consider daily scheduled ingests vs real-time

## References

- [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [IntelGraph Connector Specification](../../docs/architecture/data-intake-ga-spec.md)
- [Vulnerability Entity Schema](../../docs/schemas/vulnerability.md)
- [Golden Test Framework](../../tests/golden/README.md)

## Support

- **Issues**: https://github.com/intelgraph/summit/issues
- **Documentation**: https://docs.intelgraph.io/connectors/cisa-kev
- **Email**: data-intake-team@intelgraph.io

## Changelog

### v1.0.0 (2025-11-20)

- Initial GA release
- Complete manifest and DPIA
- Schema mapping implementation
- Golden IO test suite
- Full observability integration
- Reference implementation for connector GA spec

## License

MIT License - See LICENSE file for details

Data from CISA KEV catalog is US Government public domain.
