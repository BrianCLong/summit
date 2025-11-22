# Maestro Minimal - Run Tracking & Disclosure Packs

## Overview

The Maestro subsystem provides run tracking, artifact management, and disclosure pack generation for governance and compliance. It's designed to integrate with IntelGraph entities and decisions while providing release gate validation based on SBOM, SLSA provenance, and risk assessments.

## Architecture

### Domain Model

The Maestro system consists of three core entities:

#### 1. Run
A **Run** represents a tracked execution (build, deployment, analysis, etc.) that produces artifacts.

**Fields:**
- `id`: Unique identifier
- `name`: Human-readable name
- `owner`: User or system that owns the run
- `started_at`: When the run started
- `finished_at`: When the run completed (optional)
- `status`: Current status (pending, running, completed, failed, cancelled)
- `cost_estimate`: Estimated cost
- `cost_actual`: Actual cost incurred
- `related_entity_ids`: References to IntelGraph entities
- `related_decision_ids`: References to IntelGraph decisions
- `created_at`: Timestamp

**Integration with IntelGraph:**
- `related_entity_ids` can reference IntelGraph entities (Person, Org, Location, Event, Document)
- `related_decision_ids` can reference governance decisions
- Future: Add foreign key constraints to validate references

#### 2. Artifact
An **Artifact** is a traceable output from a run (SBOM, provenance, logs, reports, etc.).

**Fields:**
- `id`: Unique identifier
- `run_id`: Parent run
- `kind`: Type of artifact (sbom, slsa_provenance, risk_assessment, log, report, data, other)
- `path_or_uri`: Location of the artifact (S3, file path, URL)
- `content_hash`: SHA256 or similar hash for integrity
- `created_at`: Timestamp
- `metadata_json`: Governance metadata

**Metadata Structure:**
```json
{
  "sbom_present": true,
  "slsa_provenance_present": true,
  "risk_assessment_present": true,
  "additional_data": {
    "tool": "syft",
    "version": "0.68.1"
  }
}
```

#### 3. DisclosurePack
A **DisclosurePack** summarizes a run and bundles its artifacts for governance review.

**Fields:**
- `id`: Unique identifier
- `run_id`: Parent run
- `summary`: Human-readable summary
- `artifact_ids`: List of artifact IDs included in the pack
- `created_at`: Timestamp

### Release Gate Requirements

A run passes the release gate when it has at least one artifact with each of the following:
- `sbom_present: true`
- `slsa_provenance_present: true`
- `risk_assessment_present: true`

These can be in separate artifacts or combined in a single artifact.

## API Endpoints

All endpoints are prefixed with `/maestro`.

### Runs

#### Create Run
```http
POST /maestro/runs
```

**Request:**
```json
{
  "name": "Production Release v1.0",
  "owner": "release-team",
  "cost_estimate": 500.0,
  "related_entity_ids": ["entity-123", "entity-456"],
  "related_decision_ids": ["decision-789"]
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production Release v1.0",
  "owner": "release-team",
  "started_at": "2025-11-22T10:30:00Z",
  "finished_at": null,
  "status": "pending",
  "cost_estimate": 500.0,
  "cost_actual": null,
  "related_entity_ids": ["entity-123", "entity-456"],
  "related_decision_ids": ["decision-789"],
  "created_at": "2025-11-22T10:30:00Z"
}
```

#### List Runs
```http
GET /maestro/runs?owner=release-team&status=completed&limit=100
```

#### Get Run
```http
GET /maestro/runs/{run_id}
```

#### Update Run
```http
PATCH /maestro/runs/{run_id}
```

**Request:**
```json
{
  "status": "completed",
  "finished_at": "2025-11-22T11:00:00Z",
  "cost_actual": 475.0
}
```

### Artifacts

#### Create Artifact
```http
POST /maestro/artifacts
```

**Request:**
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "kind": "sbom",
  "path_or_uri": "s3://releases/v1.0/sbom.json",
  "content_hash": "sha256:abc123def456",
  "metadata_json": {
    "sbom_present": true,
    "slsa_provenance_present": false,
    "risk_assessment_present": false,
    "additional_data": {
      "tool": "syft",
      "version": "0.68.1"
    }
  }
}
```

#### List Artifacts for Run
```http
GET /maestro/runs/{run_id}/artifacts
```

### Disclosure Packs

#### Create Disclosure Pack
```http
POST /maestro/disclosure-packs
```

**Request:**
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "summary": "Complete release package with SBOM, SLSA provenance, and risk assessment",
  "artifact_ids": [
    "artifact-1",
    "artifact-2",
    "artifact-3"
  ]
}
```

#### Get Disclosure Pack for Run
```http
GET /maestro/runs/{run_id}/disclosure-pack
```

### Run Manifest (Primary Endpoint)

#### Get Complete Run Manifest
```http
GET /maestro/runs/{run_id}/manifest
```

**Response:**
```json
{
  "run": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production Release v1.0",
    "owner": "release-team",
    "status": "completed",
    ...
  },
  "artifacts": [
    {
      "id": "artifact-1",
      "kind": "sbom",
      "path_or_uri": "s3://releases/v1.0/sbom.json",
      "metadata_json": {
        "sbom_present": true,
        ...
      },
      ...
    },
    ...
  ],
  "disclosure_pack": {
    "id": "pack-1",
    "run_id": "550e8400-e29b-41d4-a716-446655440000",
    "summary": "Complete release package...",
    ...
  },
  "release_gate_passed": true
}
```

### Run Summary

#### Get Run Summary
```http
GET /maestro/runs/{run_id}/summary
```

**Response:**
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "run_name": "Production Release v1.0",
  "run_status": "completed",
  "owner": "release-team",
  "started_at": "2025-11-22T10:30:00Z",
  "finished_at": "2025-11-22T11:00:00Z",
  "release_gate": {
    "sbom_present": true,
    "slsa_provenance_present": true,
    "risk_assessment_present": true,
    "missing_requirements": [],
    "artifacts_count": 3,
    "message": "Release gate passed"
  },
  "artifacts": {
    "total_artifacts": 3,
    "by_kind": {
      "sbom": 1,
      "slsa_provenance": 1,
      "risk_assessment": 1
    },
    "governance": {
      "sbom_count": 1,
      "slsa_provenance_count": 1,
      "risk_assessment_count": 1
    }
  }
}
```

### Health

#### Health Check
```http
GET /maestro/health
```

## Usage Examples

### Complete Workflow

```bash
# 1. Create a run
RUN_ID=$(curl -X POST http://localhost:8000/maestro/runs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Release v1.0",
    "owner": "release-team",
    "cost_estimate": 500.0,
    "related_entity_ids": ["app-service", "db-service"],
    "related_decision_ids": ["decision-release-001"]
  }' | jq -r '.id')

# 2. Attach SBOM artifact
SBOM_ID=$(curl -X POST http://localhost:8000/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"kind\": \"sbom\",
    \"path_or_uri\": \"s3://releases/v1.0/sbom.json\",
    \"content_hash\": \"sha256:abc123\",
    \"metadata_json\": {
      \"sbom_present\": true,
      \"slsa_provenance_present\": false,
      \"risk_assessment_present\": false
    }
  }" | jq -r '.id')

# 3. Attach SLSA provenance artifact
SLSA_ID=$(curl -X POST http://localhost:8000/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"kind\": \"slsa_provenance\",
    \"path_or_uri\": \"s3://releases/v1.0/slsa.json\",
    \"content_hash\": \"sha256:def456\",
    \"metadata_json\": {
      \"sbom_present\": false,
      \"slsa_provenance_present\": true,
      \"risk_assessment_present\": false
    }
  }" | jq -r '.id')

# 4. Attach risk assessment artifact
RISK_ID=$(curl -X POST http://localhost:8000/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"kind\": \"risk_assessment\",
    \"path_or_uri\": \"s3://releases/v1.0/risk.pdf\",
    \"content_hash\": \"sha256:ghi789\",
    \"metadata_json\": {
      \"sbom_present\": false,
      \"slsa_provenance_present\": false,
      \"risk_assessment_present\": true
    }
  }" | jq -r '.id')

# 5. Create disclosure pack
PACK_ID=$(curl -X POST http://localhost:8000/maestro/disclosure-packs \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"summary\": \"Production release v1.0 with complete SBOM, SLSA provenance, and risk assessment\",
    \"artifact_ids\": [\"$SBOM_ID\", \"$SLSA_ID\", \"$RISK_ID\"]
  }" | jq -r '.id')

# 6. Get complete manifest and check release gate
curl http://localhost:8000/maestro/runs/$RUN_ID/manifest | jq '.'

# 7. Update run to completed
curl -X PATCH http://localhost:8000/maestro/runs/$RUN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "cost_actual": 475.0
  }'
```

### HTTPie Examples

```bash
# Create run
http POST :8000/maestro/runs \
  name="Test Run" \
  owner="alice"

# List runs
http :8000/maestro/runs owner==alice

# Get manifest
http :8000/maestro/runs/$RUN_ID/manifest
```

## Integration with IntelGraph

### Linking to Entities

When creating a run, you can link it to IntelGraph entities:

```json
{
  "name": "Threat Analysis Run",
  "owner": "analyst-team",
  "related_entity_ids": [
    "person-123",    // Person entity
    "org-456",       // Organization entity
    "event-789"      // Event entity
  ]
}
```

### Linking to Decisions

Link runs to governance decisions:

```json
{
  "name": "Production Deployment",
  "owner": "devops-team",
  "related_decision_ids": [
    "decision-approve-release-v1.0"
  ]
}
```

### Future: Foreign Key Validation

In the future, we'll add validation to ensure:
- `related_entity_ids` reference valid IntelGraph entities
- `related_decision_ids` reference valid decisions
- Proper tenant/case scoping

## Governance Checks

The `maestro_checks` module provides helpers for governance validation:

### Release Gate Check

```python
from app.services.maestro_checks import check_release_gate

passed, details = check_release_gate(run, artifacts)

if passed:
    print("Release gate passed!")
else:
    print(f"Missing: {details['missing_requirements']}")
```

### Artifact Metadata Validation

```python
from app.services.maestro_checks import validate_artifact_metadata

valid, errors = validate_artifact_metadata(artifact)

if not valid:
    print(f"Validation errors: {errors}")
```

### Artifact Summary

```python
from app.services.maestro_checks import summarize_run_artifacts

summary = summarize_run_artifacts(artifacts)
print(f"Total artifacts: {summary['total_artifacts']}")
print(f"SBOM count: {summary['governance']['sbom_count']}")
```

## Testing

### Running Tests

```bash
# Run all Maestro tests
make maestro-test

# Or using pytest directly
cd intelgraph-mvp/api
pytest tests/test_maestro.py -v

# Run specific test
pytest tests/test_maestro.py::test_complete_workflow -v
```

### Test Coverage

The test suite covers:
- ✅ Creating, listing, and updating runs
- ✅ Creating and listing artifacts
- ✅ Creating disclosure packs
- ✅ Getting run manifests
- ✅ Release gate validation (pass and fail cases)
- ✅ Run summary endpoint
- ✅ Complete end-to-end workflow

## Development

### Starting the API

```bash
# Using Make
make maestro-api

# Or using uvicorn directly
cd intelgraph-mvp/api
uvicorn app.main:app --reload --port 8000
```

### File Structure

```
intelgraph-mvp/api/
├── app/
│   ├── models/
│   │   └── maestro.py          # Domain models
│   ├── routers/
│   │   └── maestro.py          # API endpoints
│   ├── services/
│   │   └── maestro_checks.py   # Governance checks
│   └── main.py                 # FastAPI app (includes maestro router)
└── tests/
    └── test_maestro.py         # Test suite
```

## Future Enhancements

### Phase 2: Database Integration
- Replace in-memory storage with PostgreSQL/Neo4j
- Add proper foreign key constraints to IntelGraph
- Implement tenant/case scoping

### Phase 3: SBOM/SLSA Integration
- Integrate with Syft for SBOM generation
- Add SLSA provenance verification
- Automated artifact generation

### Phase 4: Advanced Governance
- Custom release gate policies
- Policy-as-code integration (OPA)
- Audit trail for governance decisions

### Phase 5: UI Integration
- Maestro dashboard in IntelGraph UI
- Visual run timelines
- Artifact explorer

## Troubleshooting

### Run not found
- Ensure the run was created successfully
- Check that you're using the correct run ID

### Release gate failing
- Use `/maestro/runs/{run_id}/summary` to see which requirements are missing
- Ensure artifacts have proper `metadata_json` with governance flags set to `true`

### Artifacts not showing up
- Verify the run ID is correct
- Check that artifacts were created successfully with `/maestro/runs/{run_id}/artifacts`

## Support

For questions or issues:
- Check the test suite for usage examples
- Review the API endpoint documentation above
- Contact the Maestro team

## License

Copyright © 2025 Topicality. All rights reserved.
