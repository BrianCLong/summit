# Maestro Minimal - Run, Artifact, and Disclosure Pack Tracking

**Version:** 0.1.0
**Status:** MVP / 2-week value slice
**Last Updated:** 2025-11-22

## Overview

Maestro Conductor is a lightweight subsystem for tracking computational runs, their artifacts, and disclosure packs. It provides the foundation for SBOM/SLSA integration and release governance within the IntelGraph platform.

### Key Capabilities

- **Run Tracking**: Track computational workflows with cost estimates, status, and metadata
- **Artifact Management**: Attach artifacts (SBOM, SLSA provenance, risk assessments, etc.) to runs
- **Disclosure Packs**: Generate comprehensive summaries of runs with artifact manifests
- **Release Gates**: Validate runs meet compliance requirements before release
- **IntelGraph Integration**: Link runs to entities and decisions in the knowledge graph

## Architecture

### Domain Model

```
┌─────────────────────┐
│       Run           │
│ ─────────────────── │
│ id, name, owner     │
│ status, costs       │
│ entity_ids          │◄──────┐
│ decision_ids        │       │
└─────────────────────┘       │
          │                   │
          │ 1:N               │
          ▼                   │
┌─────────────────────┐       │
│     Artifact        │       │
│ ─────────────────── │       │
│ id, run_id, kind    │       │
│ path_or_uri         │       │
│ content_hash        │       │
│ metadata_json       │       │
└─────────────────────┘       │
          │                   │
          │ N:1               │
          ▼                   │
┌─────────────────────┐       │
│   DisclosurePack    │       │
│ ─────────────────── │       │
│ id, run_id          │       │
│ summary             │       │
│ artifact_ids        │───────┘
└─────────────────────┘
```

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **Models** | Pydantic domain models | `maestro/models.py` |
| **Storage** | In-memory data store | `maestro/storage.py` |
| **API Router** | FastAPI endpoints | `api/maestro.py` |
| **Checks** | Release gate validation | `maestro/checks.py` |
| **App** | Standalone FastAPI app | `maestro/app.py` |
| **Tests** | Pytest test suite | `tests/maestro/` |

## Data Models

### Run

Tracks a computational workflow or analysis task.

**Fields:**
- `id`: UUID (auto-generated)
- `name`: Human-readable name
- `owner`: User/service identifier
- `started_at`: Timestamp (auto-set)
- `finished_at`: Timestamp (nullable)
- `status`: `pending`, `running`, `succeeded`, `failed`, `cancelled`
- `cost_estimate`: Estimated cost in dollars (nullable)
- `cost_actual`: Actual cost in dollars (nullable)
- `related_entity_ids`: List of IntelGraph entity UUIDs
- `related_decision_ids`: List of IntelGraph decision UUIDs
- `metadata`: Additional key-value metadata

**Example:**
```json
{
  "id": "abc-123",
  "name": "Entity network analysis - Q4 2025",
  "owner": "analyst@example.com",
  "status": "succeeded",
  "cost_estimate": 15.00,
  "cost_actual": 12.45,
  "related_entity_ids": ["entity-456", "entity-789"],
  "related_decision_ids": ["decision-101"],
  "metadata": {"project": "counter-intel", "priority": "high"}
}
```

### Artifact

An artifact produced or consumed by a run.

**Fields:**
- `id`: UUID (auto-generated)
- `run_id`: Foreign key to Run
- `kind`: `sbom`, `slsa_provenance`, `risk_assessment`, `build_log`, `test_report`, `other`
- `path_or_uri`: S3 URI, file path, or other location
- `content_hash`: SHA256 or other hash (nullable)
- `created_at`: Timestamp (auto-set)
- `metadata_json`: Governance metadata (see below)

**Metadata JSON Schema:**
- `sbom_present`: Boolean - SBOM data included
- `slsa_provenance_present`: Boolean - SLSA provenance included
- `risk_assessment_present`: Boolean - Risk assessment included
- `additional_metadata`: Dict - Other metadata

**Example:**
```json
{
  "id": "art-456",
  "run_id": "abc-123",
  "kind": "sbom",
  "path_or_uri": "s3://artifacts/2025-11-22/sbom-abc123.json",
  "content_hash": "sha256:a1b2c3d4...",
  "metadata_json": {
    "sbom_present": true,
    "slsa_provenance_present": false,
    "risk_assessment_present": false,
    "additional_metadata": {"scanner": "syft", "format": "cyclonedx"}
  }
}
```

### DisclosurePack

A comprehensive summary of a run with artifact manifest.

**Fields:**
- `id`: UUID (auto-generated)
- `run_id`: Foreign key to Run
- `summary`: Human-readable description
- `artifact_ids`: List of artifact UUIDs
- `created_at`: Timestamp (auto-set)
- `metadata`: Additional metadata

**Example:**
```json
{
  "id": "pack-789",
  "run_id": "abc-123",
  "summary": "Entity network analysis with complete SBOM, SLSA provenance, and risk assessment. 3 high-confidence entity links identified.",
  "artifact_ids": ["art-456", "art-457", "art-458"],
  "created_at": "2025-11-22T10:30:00Z"
}
```

## API Endpoints

Base path: `/maestro`

### Runs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/maestro/runs` | Create a new run |
| `GET` | `/maestro/runs` | List runs (filterable by owner, status) |
| `GET` | `/maestro/runs/{run_id}` | Get run by ID |
| `PATCH` | `/maestro/runs/{run_id}` | Update run (status, cost, metadata) |
| `GET` | `/maestro/runs/{run_id}/manifest` | Get complete run manifest |
| `GET` | `/maestro/runs/{run_id}/release-gate` | Check release gate compliance |

### Artifacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/maestro/artifacts` | Create artifact |
| `GET` | `/maestro/artifacts` | List artifacts (filterable by run_id) |
| `GET` | `/maestro/artifacts/{artifact_id}` | Get artifact by ID |

### Disclosure Packs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/maestro/disclosure-packs` | Create disclosure pack |
| `GET` | `/maestro/disclosure-packs` | List all disclosure packs |
| `GET` | `/maestro/disclosure-packs/{pack_id}` | Get pack by ID |

## Release Gate Requirements

The release gate ensures runs meet governance requirements before release/deployment.

**Requirements:**
1. Run status must be `succeeded`
2. At least one artifact must have **all three** compliance flags set to `true`:
   - `sbom_present`
   - `slsa_provenance_present`
   - `risk_assessment_present`

**Checking the Release Gate:**

```bash
curl http://localhost:8001/maestro/runs/{run_id}/release-gate
```

**Response:**
```json
{
  "run_id": "abc-123",
  "passed": true,
  "message": "Release gate passed: 2 compliant artifact(s) found",
  "details": {
    "total_artifacts": 3,
    "compliant_artifacts": 2,
    "compliant_artifact_ids": ["art-456", "art-457"]
  }
}
```

## Integration with IntelGraph

Maestro runs can reference IntelGraph entities and decisions via UUID lists:

- **`related_entity_ids`**: Links to entities (Person, Org, Location, etc.) in the knowledge graph
- **`related_decision_ids`**: Links to analytical decisions or hypotheses

**Example Use Cases:**
1. **Entity Resolution Run**: Links to entities being merged/de-duplicated
2. **Risk Assessment Run**: Links to entities under investigation and related decisions
3. **Graph Analysis Run**: Links to subgraph entities and analytical conclusions

**Validation:**
- Currently, IDs are stored as strings with no foreign-key enforcement
- Future enhancement: Add validation against IntelGraph entity/decision stores

## Usage Examples

### Example 1: Create a Run and Attach Artifacts

```bash
# 1. Create a run
curl -X POST http://localhost:8001/maestro/runs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Entity network analysis",
    "owner": "analyst@example.com",
    "cost_estimate": 10.0,
    "related_entity_ids": ["entity-123", "entity-456"]
  }'

# Response: {"id": "run-abc123", ...}

# 2. Attach SBOM artifact
curl -X POST http://localhost:8001/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "run-abc123",
    "kind": "sbom",
    "path_or_uri": "s3://artifacts/sbom.json",
    "content_hash": "sha256:abc...",
    "metadata_json": {
      "sbom_present": true,
      "slsa_provenance_present": false,
      "risk_assessment_present": false
    }
  }'

# 3. Attach SLSA provenance
curl -X POST http://localhost:8001/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "run-abc123",
    "kind": "slsa_provenance",
    "path_or_uri": "s3://artifacts/slsa.json",
    "metadata_json": {
      "sbom_present": false,
      "slsa_provenance_present": true,
      "risk_assessment_present": false
    }
  }'

# 4. Attach risk assessment
curl -X POST http://localhost:8001/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "run-abc123",
    "kind": "risk_assessment",
    "path_or_uri": "s3://artifacts/risk.json",
    "metadata_json": {
      "sbom_present": false,
      "slsa_provenance_present": false,
      "risk_assessment_present": true
    }
  }'

# 5. Update run to succeeded
curl -X PATCH http://localhost:8001/maestro/runs/run-abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "succeeded",
    "cost_actual": 8.50,
    "finished_at": "2025-11-22T10:30:00Z"
  }'
```

### Example 2: Create Disclosure Pack and Check Release Gate

```bash
# 1. Create disclosure pack
curl -X POST http://localhost:8001/maestro/disclosure-packs \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "run-abc123",
    "summary": "Entity network analysis completed with full compliance artifacts",
    "artifact_ids": ["art-1", "art-2", "art-3"]
  }'

# Response: {"id": "pack-xyz789", ...}

# 2. Fetch run manifest
curl http://localhost:8001/maestro/runs/run-abc123/manifest

# Response includes:
# - Run details
# - All artifacts
# - Disclosure pack
# - Compliance report

# 3. Check release gate
curl http://localhost:8001/maestro/runs/run-abc123/release-gate

# Response: {"passed": false, "message": "No artifacts meet compliance..."}
# (Fails because no single artifact has all three flags)
```

### Example 3: Complete Compliant Run

```bash
# Create run
RUN_ID=$(curl -s -X POST http://localhost:8001/maestro/runs \
  -H "Content-Type: application/json" \
  -d '{"name": "Compliant run", "owner": "user@example.com"}' \
  | jq -r '.id')

# Create fully compliant artifact
curl -X POST http://localhost:8001/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"kind\": \"other\",
    \"path_or_uri\": \"s3://artifacts/bundle.tgz\",
    \"metadata_json\": {
      \"sbom_present\": true,
      \"slsa_provenance_present\": true,
      \"risk_assessment_present\": true
    }
  }"

# Update run to succeeded
curl -X PATCH http://localhost:8001/maestro/runs/$RUN_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "succeeded"}'

# Check release gate (should pass!)
curl http://localhost:8001/maestro/runs/$RUN_ID/release-gate
# Response: {"passed": true, "message": "Release gate passed: 1 compliant artifact(s) found"}
```

## Running the Service

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run API server
make maestro-api

# Or manually:
python -m uvicorn maestro.app:app --host 0.0.0.0 --port 8001 --reload
```

### Running Tests

```bash
# Run all Maestro tests
make maestro-test

# Or manually:
pytest tests/maestro/ -v

# Run specific test
pytest tests/maestro/test_maestro.py::TestReleaseGate::test_release_gate_passes -v
```

## Future Enhancements

### Near-term (Next 2-week slice)
1. **Persistent Storage**: Replace in-memory store with PostgreSQL or Neo4j
2. **Foreign Key Validation**: Validate entity/decision IDs against IntelGraph
3. **SBOM/SLSA Parsers**: Auto-extract metadata from SBOM and SLSA files
4. **Webhook Notifications**: Trigger events on run completion or gate failures

### Medium-term
1. **Cost Tracking**: Integrate with cloud billing APIs for actual cost tracking
2. **Artifact Storage**: Direct S3/GCS integration for artifact upload
3. **Audit Trail**: Full provenance chain for artifact transformations
4. **Policy Engine**: Configurable release gate requirements

### Long-term
1. **Multi-tenant**: Tenant isolation and RBAC
2. **Workflow Orchestration**: DAG-based run dependencies
3. **Automated Gates**: Trigger downstream actions on gate passage
4. **Analytics Dashboard**: Visualize run costs, compliance trends

## Testing

### Test Coverage

The test suite covers:
- ✅ Run creation, retrieval, listing, updating
- ✅ Artifact creation and listing
- ✅ Disclosure pack creation
- ✅ Run manifest generation
- ✅ Release gate validation (pass/fail scenarios)
- ✅ Compliance report generation
- ✅ API endpoint integration tests

### Test Data

See `tests/maestro/conftest.py` for reusable fixtures:
- `maestro_store`: Fresh storage instance
- `client`: FastAPI test client
- `sample_run_data`: Example run creation payload
- `sample_artifact_metadata`: Example artifact metadata

## Troubleshooting

### Common Issues

**Problem**: Release gate fails with "No artifacts meet compliance requirements"

**Solution**: Ensure at least one artifact has all three flags set:
```python
metadata_json = {
  "sbom_present": true,
  "slsa_provenance_present": true,
  "risk_assessment_present": true
}
```

**Problem**: Cannot create artifact - "Run not found"

**Solution**: Verify the run exists and the `run_id` is correct:
```bash
curl http://localhost:8001/maestro/runs/{run_id}
```

**Problem**: Run manifest returns empty disclosure pack

**Solution**: Disclosure packs are optional. Create one explicitly:
```bash
curl -X POST http://localhost:8001/maestro/disclosure-packs \
  -d '{"run_id": "...", "summary": "...", "artifact_ids": [...]}'
```

## Contributing

When extending Maestro:

1. **Add tests first**: Follow TDD - write tests before implementation
2. **Update documentation**: Keep this doc in sync with code changes
3. **Maintain simplicity**: This is a 2-week MVP, avoid over-engineering
4. **Follow patterns**: Match IntelGraph MVP conventions (Pydantic, FastAPI, pytest)

## References

- **IntelGraph Models**: `intelgraph-mvp/api/app/models/__init__.py`
- **SBOM Spec**: https://cyclonedx.org/
- **SLSA Provenance**: https://slsa.dev/spec/v1.0/provenance
- **FastAPI Docs**: https://fastapi.tiangolo.com/

---

**Maintainer**: Engineering Team
**Feedback**: Submit issues to the project tracker
