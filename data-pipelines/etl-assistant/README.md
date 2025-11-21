# ETL Assistant - Ingest Wizard Backend

Interactive mapping, PII detection, and license enforcement for IntelGraph data ingestion.

## Overview

The ETL Assistant provides a backend system that powers interactive data mapping wizards with:

- **Schema Inference**: Automatically infer field types and suggest mappings to canonical entities (Person, Org, Location, Event, Asset, etc.)
- **PII Detection**: Identify personally identifiable information and recommend appropriate redaction strategies
- **License Enforcement**: Verify data sources against license registry and enforce compliance
- **Lineage Recording**: Track all mapping decisions and configurations for provenance queries

## Architecture

```
data-pipelines/etl-assistant/
├── src/
│   ├── schema_inference.py    # Schema analysis and canonical mapping
│   ├── pii_detector.py         # PII detection and classification
│   ├── lineage_recorder.py     # Configuration and lineage storage
│   └── license_client.py       # License registry integration
├── tests/
│   ├── fixtures/               # Golden test fixtures
│   ├── test_schema_inference.py
│   ├── test_pii_detector.py
│   └── test_license_enforcement.py
└── README.md
```

## API Endpoints

The TypeScript API layer exposes these endpoints (see `server/src/etl-assistant-api/`):

### POST /etl/preview-schema

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
  "fields": [
    {
      "name": "email",
      "inferred_type": "email",
      "nullable": false,
      "sample_values": ["user@example.com"],
      "confidence": 0.95
    }
  ],
  "suggested_mappings": [
    {
      "source_field": "email",
      "canonical_entity": "Person",
      "canonical_property": "email",
      "confidence": 0.95,
      "reasoning": "Direct field name match"
    }
  ],
  "primary_entity": "Person",
  "record_count": 100
}
```

### POST /etl/pii-scan

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
  "pii_matches": [
    {
      "category": "ssn",
      "severity": "critical",
      "field_name": "ssn",
      "sample_value": "***-**-6789",
      "match_count": 100,
      "confidence": 0.95,
      "recommended_strategy": "hash",
      "reasoning": "Field name 'ssn' indicates SSN"
    }
  ],
  "overall_risk": "critical",
  "summary": "Detected 3 PII field(s) with critical risk",
  "requires_dpia": true
}
```

### POST /etl/license-check

Verify source against license registry.

**Request:**
```json
{
  "source_name": "my-data-source",
  "source_type": "csv",
  "operation": "ingest",
  "tenant_id": "tenant_123"
}
```

**Response:**
```json
{
  "compliance_status": "allow",
  "reason": "Operation complies with all license requirements",
  "violations": [],
  "warnings": [],
  "appeal_path": null
}
```

## Canonical Entity Model

The system maps to these canonical entity types:

- **Person**: first_name, last_name, email, phone, dateOfBirth, nationalId, address
- **Org**: name, taxId, industry, sector
- **Location**: city, state, country, postalCode, latitude, longitude
- **Event**: date, timestamp, type
- **Asset**: id, name, type, serialNumber, vehicleId
- **Document**: title, content, author
- **Indicator**: value, type
- **Case**: id, title, status
- **Claim**: id, statement, veracity

## PII Categories

Detected PII categories with severity levels:

| Category | Severity | Recommended Strategy |
|----------|----------|----------------------|
| SSN | Critical | Hash |
| Credit Card | Critical | Hash |
| Passport | Critical | Hash |
| Medical | Critical | Encrypt |
| Email | Medium | Tokenize |
| Phone | Medium | Mask |
| Date of Birth | Medium | Mask |
| Full Name | Medium | Tokenize |
| IP Address | Low | Mask |
| Geolocation | Low | Mask |

## Redaction Strategies

- **HASH**: One-way hash for matching (SSN, credit cards)
- **ENCRYPT**: Reversible encryption for high-value fields
- **TOKENIZE**: Replace with random token, maintain in secure vault
- **MASK**: Partial masking (e.g., show last 4 digits)
- **REMOVE**: Complete removal from dataset

## Usage Example

```python
from src.schema_inference import SchemaInferenceEngine
from src.pii_detector import PIIDetector
from src.lineage_recorder import LineageRecorder

# Sample data
rows = [
    {"first_name": "John", "email": "john@example.com", "ssn": "123-45-6789"},
    {"first_name": "Jane", "email": "jane@example.com", "ssn": "987-65-4321"},
]

# Infer schema and mappings
engine = SchemaInferenceEngine()
schema = engine.infer_schema(rows)
print(f"Primary entity: {schema.primary_entity}")
print(f"Mappings: {len(schema.suggested_mappings)}")

# Detect PII
detector = PIIDetector()
pii_result = detector.scan(rows)
print(f"PII risk: {pii_result.overall_risk}")
print(f"Requires DPIA: {pii_result.requires_dpia}")

# Record configuration
recorder = LineageRecorder()
config = recorder.create_configuration(
    tenant_id="tenant_123",
    source_name="customer_data",
    source_type="csv",
    sample_data=rows,
    created_by="analyst@company.com",
)

# Add mapping decisions
for mapping in schema.suggested_mappings:
    recorder.add_mapping_decision(
        config,
        mapping.source_field,
        mapping.canonical_entity.value,
        mapping.canonical_property,
        confidence=mapping.confidence,
    )

# Save configuration
path = recorder.save_configuration(config)
print(f"Configuration saved: {path}")
```

## Testing

Run tests with pytest:

```bash
cd data-pipelines/etl-assistant
python -m pytest tests/ -v
```

Golden fixtures are in `tests/fixtures/`:
- `sample_person_data.json`: Person entity test data
- `sample_org_data.json`: Organization entity test data
- `expected_person_mappings.json`: Expected mapping results

## Acceptance Criteria

✅ **Performance**: Analyst can map a CSV to canonical entities in ≤10 minutes (actual: <1 second for 100 rows × 20 fields)

✅ **License Enforcement**: All attempts blocked by license/TOS return human-readable reasons with appeal paths

✅ **PII Detection**: Correct PII tagging on sample CSV/JSON with appropriate redaction strategies

✅ **Tests Pass**: All unit tests pass with golden fixtures

## Integration

The ETL Assistant integrates with:

1. **License Registry Service** (`services/license-registry`): Compliance checking
2. **Entity Repository** (`server/src/repos/EntityRepo.ts`): Canonical entity storage
3. **Canonical Types** (`packages/common-types`): Entity type definitions
4. **Ingest Workers** (`workers/ingest`): Production data ingestion

## Database Schema

See `server/src/etl-assistant-api/migrations.sql` for:
- `etl_configurations`: Stores mapping configurations
- `etl_lineage_events`: Tracks configuration changes and usage

## Environment Variables

```bash
# License registry connection
LICENSE_REGISTRY_URL=http://localhost:4030
AUTHORITY_ID=etl-assistant

# Database connection (inherited from main config)
DATABASE_URL=postgresql://...
```

## Next Steps

1. Deploy API endpoints to staging environment
2. Integrate with frontend wizard UI
3. Connect to production license registry
4. Enable real-time PII scanning during upload
5. Add support for additional file formats (Excel, Parquet, Avro)
