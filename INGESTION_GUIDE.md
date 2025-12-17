# IntelGraph Data Ingestion Guide

## Overview

This guide provides a comprehensive overview of the IntelGraph data ingestion system, including the ingestion wizard, connector framework, ETL assistant, and enrichment pipeline.

## Quick Start

### 1. Run the Ingestion Wizard

```bash
cd ingestion
python3 wizard.py
```

The wizard will guide you through:
1. Selecting a connector
2. Validating the connector manifest
3. Reviewing proposed field mappings
4. Making PII handling decisions
5. Reviewing license restrictions
6. Running the ingestion

### 2. Using the ETL Assistant API

```bash
# Start the API server (if not already running)
cd server
npm run dev

# Test the API
curl -X POST http://localhost:4000/etl/preview-schema \
  -H "Content-Type: application/json" \
  -d '{
    "sample_rows": [
      {"name": "John Doe", "email": "john@example.com", "ip": "8.8.8.8"}
    ],
    "tenant_id": "tenant_123"
  }'
```

### 3. Programmatic Usage

```python
# Python streaming pipeline example
import asyncio
from data_pipelines.etl_assistant.src.streaming_pipeline import (
    StreamingETLPipeline,
    PipelineConfig,
)

async def main():
    # Configure pipeline
    config = PipelineConfig(
        tenant_id='tenant_123',
        source_name='customer_data',
        source_type='csv',
        enable_enrichers=True,
        enricher_config={
            'geoip': {'enabled': True},
            'language': {'enabled': True},
            'hashing': {'enabled': True},
        },
    )

    # Create pipeline
    pipeline = StreamingETLPipeline(config)

    # Create queues
    input_queue = asyncio.Queue()
    output_queue = asyncio.Queue()

    # Add records
    await input_queue.put({'name': 'John', 'ip': '8.8.8.8'})
    await input_queue.put(None)  # Sentinel

    # Process
    metrics = await pipeline.process_stream(input_queue, output_queue)
    print(f"Processed {metrics.records_processed} records")

asyncio.run(main())
```

## System Components

### 1. Connectors

Connectors fetch data from external sources and map it to canonical entities.

**Available Connectors:**
- **File-based:** CSV, Parquet, JSON
- **Threat Intel:** STIX/TAXII
- **SIEM:** Splunk, Sentinel, Chronicle
- **OSINT:** RSS News
- **Cloud:** S3 CSV
- **Geospatial:** Mapbox, ESRI
- **Database:** DuckDB, Elasticsearch

**Create a Custom Connector:**

```python
from connectors.sdk.base import BaseConnector

class MyConnector(BaseConnector):
    def fetch_raw_data(self):
        # Fetch data from your source
        for record in my_data_source:
            yield record

    def map_to_entities(self, raw_data):
        # Map to canonical entities
        entity = {
            'type': 'Person',
            'properties': {
                'name': raw_data['name'],
                'email': raw_data['email'],
            },
        }
        return [entity], []
```

### 2. ETL Assistant

The ETL Assistant provides intelligent schema inference, PII detection, and license enforcement.

**API Endpoints:**

```bash
# Schema preview
POST /etl/preview-schema
# Returns: inferred fields, suggested mappings, primary entity

# PII scan
POST /etl/pii-scan
# Returns: PII matches, risk level, recommended strategies

# License check
POST /etl/license-check
# Returns: compliance status, violations, warnings

# Save configuration
POST /etl/configurations
# Returns: configuration ID
```

### 3. Enrichers

Enrichers augment data as it flows through the pipeline.

**Available Enrichers:**

| Enricher | Purpose | Performance |
|----------|---------|-------------|
| GeoIP | IP → location | <10ms |
| Language | Text → language | <10ms |
| Hashing | Content → hash | <10ms |
| EXIF Scrub | Image → scrubbed | <10ms |
| OCR | Image → text | <500ms |
| STT | Audio → transcript | <5s |

**Configure Enrichers:**

```python
enricher_config = {
    'geoip': {
        'enabled': True,
        'max_latency_ms': 10,
    },
    'language': {
        'enabled': True,
        'min_text_length': 10,
    },
    'hashing': {
        'enabled': True,
        'hash_algorithms': ['sha256'],
        'hash_all_content': True,
    },
}
```

### 4. Streaming Pipeline

The streaming pipeline processes records asynchronously with backpressure handling.

**Features:**
- Async batch processing
- Configurable batch size and workers
- Pluggable enrichers
- Provenance emission
- Error handling and retry

**Configuration:**

```python
config = PipelineConfig(
    tenant_id='tenant_123',
    source_name='data_source',
    source_type='csv',
    batch_size=100,        # Records per batch
    max_workers=4,         # Concurrent workers
    enable_enrichers=True,
    emit_provenance=True,
)
```

## Data Flow

```
External Source
      │
      ▼
┌──────────────┐
│  Connector   │ ← fetch_raw_data()
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ map_to_entities()
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Pipeline   │ ← Streaming ETL
└──────┬───────┘
       │
       ├─► GeoIP Enricher
       ├─► Language Enricher
       ├─► Hashing Enricher
       └─► (more enrichers)
       │
       ▼
┌──────────────┐
│ PII Filter   │ ← Redaction
└──────┬───────┘
       │
       ▼
┌──────────────┐
│License Filter│ ← Enforcement
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Graph API   │ ← Canonical entities
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Prov Ledger  │ ← Lineage events
└──────────────┘
```

## Common Tasks

### Add a New Connector

1. **Create connector directory:**
   ```bash
   mkdir -p connectors/my_connector
   cd connectors/my_connector
   ```

2. **Create manifest.yaml:**
   ```yaml
   name: my-connector
   version: 1.0.0
   description: My custom connector
   ingestion_type: batch
   supported_formats:
     - custom

   configuration:
     batch_size: 1000

   pii_flags: []
   license:
     type: Custom
     classification: unknown
   ```

3. **Create connector.py:**
   ```python
   from sdk.base import BaseConnector

   class MyConnector(BaseConnector):
       def fetch_raw_data(self):
           # Implementation
           pass

       def map_to_entities(self, raw_data):
           # Implementation
           pass
   ```

4. **Add to registry:**
   Edit `connectors/registry.json` to add your connector.

5. **Test:**
   ```bash
   python3 connector.py
   ```

### Add a New Enricher

1. **Create enricher file:**
   ```bash
   cd data-pipelines/etl-assistant/src/enrichers
   touch my_enricher.py
   ```

2. **Implement enricher:**
   ```python
   from .base import BaseEnricher, EnricherResult, EnrichmentContext

   class MyEnricher(BaseEnricher):
       def can_enrich(self, data):
           # Check if enricher can process this data
           return 'my_field' in data

       def enrich(self, data, context):
           result = EnricherResult(success=True)

           # Perform enrichment
           enriched_value = my_enrichment_logic(data['my_field'])

           # Add to result
           result.add_enrichment('my_enrichment', enriched_value)

           return result
   ```

3. **Register enricher:**
   Add to `enrichers/__init__.py` and `streaming_pipeline.py`

4. **Test:**
   ```bash
   pytest tests/test_enrichers.py::TestMyEnricher -v
   ```

### Ingest a CSV File

1. **Prepare data:**
   ```csv
   name,email,ip
   John Doe,john@example.com,8.8.8.8
   Jane Smith,jane@example.com,1.1.1.1
   ```

2. **Create manifest (if needed):**
   ```yaml
   name: my-csv-import
   sample_data_file: data.csv
   ```

3. **Run wizard:**
   ```bash
   cd ingestion
   python3 wizard.py
   ```

4. **Or use programmatically:**
   ```python
   from connectors.csv_connector.connector import CSVConnector

   connector = CSVConnector('manifest.yaml', 'data.csv')
   results = connector.run()
   print(f"Processed {results['stats']['records_processed']} records")
   ```

### Ingest a Parquet File

1. **Prepare data:**
   ```python
   import pyarrow as pa
   import pyarrow.parquet as pq

   data = {
       'name': ['John Doe', 'Jane Smith'],
       'email': ['john@example.com', 'jane@example.com'],
       'ip': ['8.8.8.8', '1.1.1.1'],
   }

   table = pa.table(data)
   pq.write_table(table, 'data.parquet')
   ```

2. **Use connector:**
   ```python
   from connectors.parquet_connector.connector import ParquetConnector

   connector = ParquetConnector('manifest.yaml', 'data.parquet')
   results = connector.run()
   ```

### Monitor Ingestion

1. **Check metrics:**
   ```python
   # Pipeline metrics
   print(f"Records processed: {metrics.records_processed}")
   print(f"Success rate: {metrics.records_succeeded / metrics.records_processed}")
   print(f"Duration: {metrics.total_duration_ms}ms")

   # Enricher metrics
   enricher_metrics = pipeline.get_enricher_metrics()
   for name, metrics in enricher_metrics.items():
       print(f"{name}: {metrics['success_rate']*100:.1f}% success")
   ```

2. **View provenance:**
   ```bash
   # Query provenance ledger
   curl http://localhost:4030/provenance/events?source=my_source
   ```

3. **Check logs:**
   ```bash
   # View pipeline logs
   tail -f logs/etl-pipeline.log
   ```

## PII Handling

The system automatically detects and handles PII:

### PII Categories

| Category | Severity | Default Strategy |
|----------|----------|------------------|
| SSN | Critical | Hash |
| Credit Card | Critical | Hash |
| Email | Medium | Tokenize |
| Phone | Medium | Mask |
| Name | Medium | Tokenize |
| IP Address | Low | Mask |

### Redaction Strategies

- **HASH:** One-way hash (SHA-256)
- **ENCRYPT:** Reversible encryption
- **TOKENIZE:** Replace with random token
- **MASK:** Partial masking (e.g., last 4 digits)
- **REMOVE:** Complete removal

### Configure PII Handling

```yaml
# In connector manifest
pii_flags:
  - field_name: ssn
    severity: critical
    redaction_policy: block  # allow, redact, block, prompt
    pattern: "^\\d{3}-\\d{2}-\\d{4}$"

  - field_name: email
    severity: medium
    redaction_policy: allow
```

## License Enforcement

The system enforces data license compliance:

### License Types

- **Open Source:** MIT, Apache, GPL
- **Commercial:** Proprietary, subscription
- **Government:** Public domain, restricted
- **Custom:** User-defined terms

### Compliance Checking

```python
# Check license compliance
response = await api.post('/etl/license-check', {
    'source_name': 'my_source',
    'source_type': 'csv',
    'operation': 'ingest',
    'tenant_id': 'tenant_123',
})

if response['compliance_status'] == 'block':
    print(f"Blocked: {response['reason']}")
    print(f"Violations: {response['violations']}")
    print(f"Appeal: {response['appeal_path']}")
```

### Configure License

```yaml
# In connector manifest
license:
  type: MIT
  classification: open-source
  attribution_required: true
  allowed_use_cases:
    - internal-analysis
    - investigation
  blocked_use_cases:
    - commercial-redistribution
  blocked_fields:
    - field_name: proprietary_score
      reason: Licensed for internal use only
      alternative: public_score
```

## Testing

### Run All Tests

```bash
# ETL Assistant tests
pytest data-pipelines/etl-assistant/tests/ -v

# Connector tests
pytest connectors/__tests__/ -v

# Integration tests
pytest tests/ingestion/ -v
```

### Run Specific Tests

```bash
# Test enrichers
pytest data-pipelines/etl-assistant/tests/test_enrichers.py -v

# Test streaming pipeline
pytest data-pipelines/etl-assistant/tests/test_streaming_pipeline.py -v

# Test with coverage
pytest --cov=data-pipelines/etl-assistant/src --cov-report=html
```

### Test Data

Golden fixtures are in `data-pipelines/etl-assistant/tests/fixtures/`:
- `sample_person_data.json`
- `sample_org_data.json`
- `expected_person_mappings.json`

## Performance Tuning

### Pipeline Optimization

```python
# Increase throughput
config = PipelineConfig(
    batch_size=500,        # Larger batches
    max_workers=8,         # More workers
    backpressure_threshold=5000,  # Higher queue limit
)

# Reduce latency
config = PipelineConfig(
    batch_size=10,         # Smaller batches
    max_workers=2,         # Fewer workers
    enricher_config={
        'ocr': {'enabled': False},  # Disable slow enrichers
        'stt': {'enabled': False},
    },
)
```

### Connector Optimization

```python
# CSV connector
config = {
    'batch_size': 5000,    # Read more rows per batch
    'skip_header': True,
}

# Parquet connector
config = {
    'batch_size': 10000,   # Larger batches for columnar data
    'columns': ['id', 'name', 'email'],  # Read only needed columns
}
```

### Enricher Optimization

```python
# Disable slow enrichers
enricher_config = {
    'geoip': {'enabled': True},      # Fast
    'language': {'enabled': True},    # Fast
    'hashing': {'enabled': True},     # Fast
    'exif_scrub': {'enabled': False}, # Medium
    'ocr': {'enabled': False},        # Slow
    'stt': {'enabled': False},        # Slow
}
```

## Troubleshooting

### Common Issues

#### Issue: Connector fails to connect

**Solution:**
1. Check connector manifest is valid
2. Verify credentials/API keys
3. Check network connectivity
4. Review connector logs

#### Issue: PII detection false positives

**Solution:**
1. Adjust confidence threshold in `pii_detector.py`
2. Add field to whitelist in manifest
3. Use custom PII patterns

#### Issue: License check blocks ingestion

**Solution:**
1. Register data source in license registry
2. Update license terms
3. File appeal if needed
4. Use different data source

#### Issue: Pipeline is slow

**Solution:**
1. Increase batch size
2. Increase max workers
3. Disable slow enrichers
4. Use faster hardware
5. Check for bottlenecks in enrichers

#### Issue: Out of memory

**Solution:**
1. Reduce batch size
2. Reduce max workers
3. Use streaming instead of batch
4. Increase available memory

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Verbose pipeline
config = PipelineConfig(
    # ... other config ...
    enable_enrichers=True,
)

pipeline = StreamingETLPipeline(config)

# Custom error handler
def debug_error_handler(error, record):
    print(f"Error: {error}")
    print(f"Record: {record}")
    import traceback
    traceback.print_exc()

pipeline.set_error_handler(debug_error_handler)
```

## Additional Resources

- [ETL Assistant Architecture](data-pipelines/etl-assistant/ARCHITECTURE.md)
- [ETL Assistant README](data-pipelines/etl-assistant/README.md)
- [Connector SDK](connectors/README.md)
- [License Registry](services/license-registry/README.md)
- [Provenance Ledger](services/prov-ledger/README.md)

## Support

For issues and questions:
- File issues at: https://github.com/BrianCLong/summit/issues
- Slack: #data-platform
- Email: data-platform@intelgraph.com
