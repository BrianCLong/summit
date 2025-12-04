# ETL Assistant Architecture

## Overview

The ETL Assistant provides a complete ingestion and enrichment pipeline for the IntelGraph platform, enabling data analysts to quickly map external data sources to canonical entities with automatic PII detection, license enforcement, and provenance tracking.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ingestion Wizard UI/CLI                     │
│  - Sample upload                                                │
│  - Schema preview                                               │
│  - Field mapping                                                │
│  - PII review                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ETL Assistant API (TypeScript)                │
│  POST /etl/preview-schema    - Schema inference                │
│  POST /etl/pii-scan          - PII detection                   │
│  POST /etl/license-check     - License compliance              │
│  POST /etl/configurations    - Save mapping config             │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Schema     │  │     PII      │  │   License    │
│  Inference   │  │   Detector   │  │   Registry   │
│   (Python)   │  │   (Python)   │  │  Integration │
└──────────────┘  └──────────────┘  └──────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                Streaming ETL Pipeline (Python)                  │
│  - Async batch processing                                       │
│  - Backpressure handling                                        │
│  - Provenance emission                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┬──────────────┐
          ▼              ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    GeoIP     │  │   Language   │  │   Hashing    │  │  EXIF Scrub  │
│   Enricher   │  │   Enricher   │  │   Enricher   │  │   Enricher   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
          │              │              │              │
          └──────────────┼──────────────┼──────────────┘
                         ▼              ▼
                  ┌──────────────┐  ┌──────────────┐
                  │     OCR      │  │     STT      │
                  │   Enricher   │  │   Enricher   │
                  └──────────────┘  └──────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Connector Framework (Python)                  │
│  - BaseConnector interface                                      │
│  - CSV, Parquet, STIX/TAXII, SIEM, OSINT connectors            │
│  - Rate limiting, error handling                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Graph API  │  │  Prov Ledger │  │   Metrics    │
│   (Ingest)   │  │   (Events)   │  │  (Prometheus)│
└──────────────┘  └──────────────┘  └──────────────┘
```

## Components

### 1. Ingestion Wizard (`ingestion/wizard.py`)

Interactive CLI for configuring and running connector ingestion.

**Features:**
- Connector selection and validation
- Auto-proposed field mappings
- PII detection and review
- License enforcement display
- Lineage recording

**Workflow:**
1. User selects a connector
2. Wizard validates connector manifest
3. System proposes field mappings based on sample data
4. User reviews PII flags and makes decisions
5. User reviews license restrictions
6. Wizard runs ingestion with all safeguards active

### 2. ETL Assistant API (`server/src/etl-assistant-api/`)

REST API for schema inference, PII scanning, and license checking.

**Endpoints:**

#### `POST /etl/preview-schema`
Infer schema from sample rows and suggest canonical mappings.

**Request:**
```json
{
  "sample_rows": [{"field1": "value1", ...}],
  "tenant_id": "tenant_123"
}
```

**Response:**
```json
{
  "fields": [{
    "name": "email",
    "inferred_type": "email",
    "nullable": false,
    "sample_values": ["user@example.com"],
    "confidence": 0.95
  }],
  "suggested_mappings": [{
    "source_field": "email",
    "canonical_entity": "Person",
    "canonical_property": "email",
    "confidence": 0.95,
    "reasoning": "Direct field name match"
  }],
  "primary_entity": "Person",
  "record_count": 100
}
```

#### `POST /etl/pii-scan`
Scan sample data for PII and recommend redactions.

**Request:**
```json
{
  "sample_rows": [{"ssn": "123-45-6789", ...}],
  "tenant_id": "tenant_123"
}
```

**Response:**
```json
{
  "pii_matches": [{
    "category": "ssn",
    "severity": "critical",
    "field_name": "ssn",
    "sample_value": "***-**-6789",
    "match_count": 100,
    "confidence": 0.95,
    "recommended_strategy": "hash",
    "reasoning": "Field name 'ssn' indicates SSN"
  }],
  "overall_risk": "critical",
  "summary": "Detected 3 PII field(s) with critical risk",
  "requires_dpia": true
}
```

#### `POST /etl/license-check`
Verify source against license registry.

#### `POST /etl/configurations`
Save ETL configuration with lineage.

### 3. Streaming ETL Pipeline (`data-pipelines/etl-assistant/src/streaming_pipeline.py`)

Asynchronous streaming pipeline with enrichment support.

**Features:**
- Async batch processing (configurable batch size)
- Backpressure handling (max concurrent workers)
- Pluggable enrichers
- Provenance event emission
- Comprehensive metrics collection

**Configuration:**
```python
config = PipelineConfig(
    tenant_id='tenant_123',
    source_name='customer_data',
    source_type='csv',
    batch_size=100,
    max_workers=4,
    enable_enrichers=True,
    enricher_config={
        'geoip': {'enabled': True},
        'language': {'enabled': True},
        'hashing': {'enabled': True, 'hash_all_content': True},
        'exif_scrub': {'enabled': False},
        'ocr': {'enabled': False},
        'stt': {'enabled': False},
    },
    emit_provenance=True,
)
```

**Usage:**
```python
pipeline = StreamingETLPipeline(config)

# Set handlers
pipeline.set_provenance_handler(lambda event: send_to_ledger(event))
pipeline.set_error_handler(lambda err, record: log_error(err, record))

# Process stream
metrics = await pipeline.process_stream(input_queue, output_queue)
```

### 4. Enrichers (`data-pipelines/etl-assistant/src/enrichers/`)

Pluggable enrichers for streaming ETL.

#### Base Enricher (`base.py`)

All enrichers inherit from `BaseEnricher` and implement:
- `can_enrich(data)` - Check if enricher can process data
- `enrich(data, context)` - Perform enrichment

Enrichers automatically track:
- Total/successful/failed enrichments
- Duration metrics
- Error messages

#### GeoIP Enricher (`geoip.py`)

Enriches IP addresses with geographical information.

**Input:** IP address fields (`ip`, `source_ip`, `dest_ip`, etc.)

**Output:**
```python
{
    'geo': {
        'ip_geo': {
            'ip': '8.8.8.8',
            'country_code': 'US',
            'city': 'San Francisco',
            'latitude': 37.7749,
            'longitude': -122.4194,
            'timezone': 'America/Los_Angeles',
            'asn': 'AS15169',
            'asn_org': 'Google LLC'
        }
    }
}
```

**Performance:** <10ms per record (stub implementation)

#### Language Enricher (`language.py`)

Detects language of text content.

**Input:** Text fields (`text`, `content`, `body`, `message`, etc.)

**Output:**
```python
{
    'language': {
        'text_language': {
            'language': 'fr',
            'confidence': 0.85,
            'script': 'Latin',
            'alternative_languages': [
                {'language': 'en', 'score': 0.15}
            ]
        }
    }
}
```

**Performance:** <10ms per record (stub implementation)

#### Hashing Enricher (`hashing.py`)

Generates content hashes for integrity and deduplication.

**Algorithms:**
- SHA-256 (default)
- SHA-512
- MD5 (for non-security purposes)
- Perceptual hash (pHash) for images (stub)
- Fuzzy hash (ssdeep) for similarity matching (stub)

**Output:**
```python
{
    'hashes': {
        'content_hash': {
            'sha256': 'abc123...',
            'md5': 'def456...'
        }
    }
}
```

#### EXIF Scrub Enricher (`exif_scrub.py`)

Scrubs EXIF metadata from images.

**Removed tags:**
- GPS coordinates
- Camera make/model
- Software information
- Timestamps
- User comments

**Output:**
```python
{
    'exif_scrub': {
        'image_url_scrubbed': {
            'removed_tags': ['GPSInfo', 'Make', 'Model', ...],
            'preserved_tags': ['Orientation'],
            'scrubbed_at': 'timestamp'
        }
    }
}
```

#### OCR Enricher (`ocr_stt.py`)

Extracts text from images and documents via AI engine integration.

**Integration:** POST to `{ai_engine_url}/ocr/extract`

**Output:**
```python
{
    'ocr': {
        'document_url_ocr': {
            'text': 'Extracted text content',
            'confidence': 0.85,
            'language': 'eng',
            'word_count': 150
        }
    }
}
```

#### STT Enricher (`ocr_stt.py`)

Transcribes audio content via AI engine integration.

**Integration:** POST to `{ai_engine_url}/stt/transcribe`

**Output:**
```python
{
    'stt': {
        'audio_url_transcript': {
            'transcript': 'Transcribed speech content',
            'confidence': 0.88,
            'language': 'en-US',
            'duration_seconds': 120.5,
            'speakers': [
                {'speaker_id': 'SPEAKER_00', 'segments': [...]}
            ]
        }
    }
}
```

### 5. Connector Framework (`connectors/sdk/`)

Base connector interface with built-in PII, license, and rate limiting.

#### Base Connector (`sdk/base.py`)

All connectors inherit from `BaseConnector` and implement:
- `fetch_raw_data()` - Fetch data from source (iterator)
- `map_to_entities()` - Map raw data to canonical entities

Built-in features:
- Rate limiting with backoff
- PII detection and redaction
- License enforcement
- Lineage tracking
- Statistics collection

#### Available Connectors

1. **CSV Connector** (`csv_connector/`)
   - Supports custom delimiters, encodings
   - Batch processing
   - Schema validation

2. **Parquet Connector** (`parquet_connector/`) **NEW**
   - Columnar data handling
   - Memory-efficient batch reading
   - Schema validation
   - Supports column filtering

3. **STIX/TAXII Connector** (`stix_taxii_connector/`)
   - Threat intelligence feeds
   - Incremental updates
   - Entity type mapping

4. **SIEM Connectors**
   - Splunk (`splunk_connector/`)
   - Sentinel (`sentinel_connector/`)
   - Chronicle (`chronicle_connector/`)

5. **OSINT Connector**
   - RSS News (`rss_news_connector/`)

## Data Flow

### Ingestion Flow

1. **Upload/Connect**
   - User uploads sample data or connects to source
   - Wizard validates connector manifest

2. **Schema Inference**
   - ETL Assistant API analyzes sample rows
   - Infers field types (email, phone, date, etc.)
   - Suggests canonical entity mappings
   - Returns confidence scores

3. **PII Scanning**
   - API scans for PII patterns
   - Classifies severity (critical, high, medium, low)
   - Recommends redaction strategies
   - Determines if DPIA required

4. **License Check**
   - API queries license registry
   - Checks compliance for operation type
   - Returns violations and warnings
   - Provides appeal path if blocked

5. **User Review**
   - User confirms/adjusts mappings
   - User approves/modifies PII handling
   - User acknowledges license terms

6. **Configuration Save**
   - API saves configuration to database
   - Records lineage event
   - Returns configuration ID

7. **Streaming Ingestion**
   - Connector fetches data in batches
   - Streaming pipeline applies enrichers
   - PII/license filters applied
   - Enriched data sent to Graph API
   - Provenance events emitted

### Enrichment Flow

1. **Record arrives in pipeline**
2. **For each enricher:**
   - Check `can_enrich(data)` - Should this enricher process this record?
   - If yes, call `enrich(data, context)` with timing
   - Merge enriched data into record
   - Track metrics
3. **Add enrichment metadata** to record
4. **Emit provenance event** (if enabled)
5. **Put enriched record in output queue**

## Configuration

### Enricher Configuration

```python
enricher_config = {
    'geoip': {
        'enabled': True,
        'max_latency_ms': 10,
    },
    'language': {
        'enabled': True,
        'min_text_length': 10,
        'confidence_threshold': 0.5,
    },
    'hashing': {
        'enabled': True,
        'hash_algorithms': ['sha256', 'md5'],
        'hash_all_content': True,
        'hash_fields': ['content', 'body'],
        'enable_perceptual': False,
        'enable_fuzzy': False,
    },
    'exif_scrub': {
        'enabled': False,
        'preserve_orientation': True,
        'remove_all': False,
    },
    'ocr': {
        'enabled': False,
        'ai_engine_url': 'http://localhost:8000',
        'confidence_threshold': 0.7,
        'languages': ['eng'],
    },
    'stt': {
        'enabled': False,
        'ai_engine_url': 'http://localhost:8000',
        'confidence_threshold': 0.7,
        'language': 'en-US',
        'enable_diarization': False,
    },
}
```

### Pipeline Configuration

```python
config = PipelineConfig(
    tenant_id='tenant_123',
    source_name='customer_data',
    source_type='csv',
    batch_size=100,           # Records per batch
    max_workers=4,            # Concurrent batch processors
    enable_enrichers=True,
    enricher_config={...},
    emit_provenance=True,
    backpressure_threshold=1000,  # Queue size limit
)
```

## Performance

### Throughput

- **Schema inference:** <1 second for 100 rows × 20 fields
- **PII scanning:** <1 second for 100 rows × 20 fields
- **Enrichment:** <10ms per enricher per record (stub implementations)
- **Pipeline throughput:** ~1000 records/second (4 workers, batch size 100)

### Latency Targets

| Component | Target | Stub | Production |
|-----------|--------|------|------------|
| GeoIP enricher | <10ms | ✅ | Use MaxMind GeoIP2 |
| Language enricher | <10ms | ✅ | Use fastText or langdetect |
| Hashing enricher | <10ms | ✅ | ✅ (native Python) |
| EXIF scrub enricher | <10ms | ✅ | Use Pillow |
| OCR enricher | <500ms | ⚠️ | Integrate AI engine |
| STT enricher | <5s | ⚠️ | Integrate AI engine |

## Metrics

### Pipeline Metrics

```python
metrics = {
    'records_processed': 1000,
    'records_succeeded': 995,
    'records_failed': 5,
    'total_duration_ms': 5432.1,
    'enrichments_applied': 2985,
    'enrichment_duration_ms': 2143.5,
    'errors': ['Error 1', 'Error 2', ...],
}
```

### Enricher Metrics

```python
enricher_metrics = {
    'total_enrichments': 995,
    'successful_enrichments': 990,
    'failed_enrichments': 5,
    'total_duration_ms': 724.3,
    'average_duration_ms': 0.73,
    'success_rate': 0.995,
}
```

## Error Handling

### Enricher Errors

Enrichers catch exceptions and return `EnricherResult` with:
- `success = False`
- `errors = [error_message]`
- Failed enrichments don't block pipeline

### Pipeline Errors

Pipeline continues on record-level errors:
- Error logged
- Record marked as failed
- Error handler called (if set)
- Next record processed

### Connector Errors

Connectors implement retry with exponential backoff:
- Rate limit errors → wait and retry
- Network errors → exponential backoff
- Validation errors → fail fast

## Testing

### Unit Tests

- `test_enrichers.py` - All enricher tests
- `test_streaming_pipeline.py` - Pipeline tests
- `test_schema_inference.py` - Schema inference tests
- `test_pii_detector.py` - PII detection tests
- `test_license_enforcement.py` - License enforcement tests

### Integration Tests

```bash
# Run all tests
pytest data-pipelines/etl-assistant/tests/ -v

# Run specific test file
pytest data-pipelines/etl-assistant/tests/test_enrichers.py -v

# Run with coverage
pytest data-pipelines/etl-assistant/tests/ --cov=src --cov-report=html
```

### Golden Fixtures

- `tests/fixtures/sample_person_data.json`
- `tests/fixtures/sample_org_data.json`
- `tests/fixtures/expected_person_mappings.json`

## Deployment

### Dependencies

```bash
# Python dependencies
pip install -r data-pipelines/etl-assistant/requirements.txt

# Includes:
# - pyarrow (for Parquet support)
# - asyncio (for streaming pipeline)
# - pytest (for testing)
```

### Environment Variables

```bash
# License registry connection
LICENSE_REGISTRY_URL=http://localhost:4030
AUTHORITY_ID=etl-assistant

# Database connection
DATABASE_URL=postgresql://...

# AI engine (for OCR/STT)
AI_ENGINE_URL=http://localhost:8000

# Python path
PYTHON_PATH=python3
```

## Future Enhancements

### Production Enrichers

1. **GeoIP:** Integrate MaxMind GeoIP2 or IP2Location
2. **Language:** Integrate fastText or langdetect
3. **EXIF:** Integrate Pillow for actual EXIF scrubbing
4. **pHash:** Integrate ImageHash for perceptual hashing
5. **Fuzzy:** Integrate ssdeep or TLSH for fuzzy hashing

### Additional Enrichers

- **Entity extraction:** NER from text content
- **Sentiment analysis:** Sentiment scoring
- **Data quality:** Completeness, accuracy scoring
- **Deduplication:** Similarity matching and merging

### Scalability

- **Distributed processing:** Kafka/Redpanda integration
- **Horizontal scaling:** Multiple pipeline workers
- **Caching:** Redis for GeoIP/language lookups
- **Checkpointing:** Resume from failure points

## References

- [ETL Assistant README](README.md)
- [Connector SDK](../../connectors/README.md)
- [License Registry](../../services/license-registry/README.md)
- [Provenance Ledger](../../services/prov-ledger/README.md)
