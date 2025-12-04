# Maestro Conductor - Quick Reference

## File Tree

```
maestro/
├── __init__.py           # Package exports
├── models.py             # Domain models (Run, Artifact, DisclosurePack)
├── storage.py            # In-memory storage layer
├── checks.py             # Release gate validation
├── app.py                # FastAPI application
├── requirements.txt      # Python dependencies
└── README.md             # This file

api/
└── maestro.py            # FastAPI router with endpoints

tests/maestro/
├── __init__.py           # Test package
├── conftest.py           # Pytest fixtures
└── test_maestro.py       # Integration tests

docs/
└── maestro_minimal.md    # Full documentation
```

## Key Modules

### `maestro/models.py`
Domain models with Pydantic:
- `Run`: Workflow/computation tracker
- `Artifact`: Build outputs, SBOMs, provenance files
- `DisclosurePack`: Summarizes runs with artifact manifests
- `RunStatus`, `ArtifactKind`: Enums for status/types
- `ArtifactMetadata`: Governance flags (SBOM, SLSA, risk)

### `maestro/storage.py`
In-memory storage (MaestroStore):
- `create_run()`, `get_run()`, `list_runs()`, `update_run()`
- `create_artifact()`, `get_artifact()`, `list_artifacts()`
- `create_disclosure_pack()`, `get_disclosure_pack()`, `list_disclosure_packs()`

### `maestro/checks.py`
Release gate validation:
- `check_release_gate(store, run_id)`: Validates compliance
- `generate_compliance_report(store, run_id)`: Detailed report
- `check_artifact_compliance(artifact)`: Per-artifact check

### `api/maestro.py`
FastAPI router with endpoints:
- **Runs**: POST/GET/PATCH `/maestro/runs`
- **Artifacts**: POST/GET `/maestro/artifacts`
- **Disclosure Packs**: POST/GET `/maestro/disclosure-packs`
- **Manifest**: GET `/maestro/runs/{id}/manifest`
- **Release Gate**: GET `/maestro/runs/{id}/release-gate`

## Quick Start

### 1. Install Dependencies

```bash
# From summit root
pip install -r maestro/requirements.txt
# or
source .venv/bin/activate
pip install -r maestro/requirements.txt
```

### 2. Run Tests

```bash
# Using make
make maestro-test

# Or directly with pytest
pytest tests/maestro/ -v

# Run specific test
pytest tests/maestro/test_maestro.py::TestReleaseGate::test_release_gate_passes -v
```

### 3. Start API Server

```bash
# Using make (recommended)
make maestro-api

# Or directly with uvicorn
python -m uvicorn maestro.app:app --host 0.0.0.0 --port 8001 --reload
```

API will be available at: `http://localhost:8001`
Interactive docs: `http://localhost:8001/docs`

## Example Commands

### Create a Run

```bash
curl -X POST http://localhost:8001/maestro/runs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Entity network analysis - Q4 2025",
    "owner": "analyst@example.com",
    "cost_estimate": 10.0,
    "related_entity_ids": ["entity-123", "entity-456"],
    "related_decision_ids": ["decision-789"]
  }'
```

**Response:**
```json
{
  "id": "abc-123-def-456",
  "name": "Entity network analysis - Q4 2025",
  "owner": "analyst@example.com",
  "status": "pending",
  "started_at": "2025-11-22T10:00:00Z",
  "related_entity_ids": ["entity-123", "entity-456"],
  "related_decision_ids": ["decision-789"],
  ...
}
```

### Attach an Artifact

```bash
# Replace RUN_ID with actual ID from previous step
RUN_ID="abc-123-def-456"

curl -X POST http://localhost:8001/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"kind\": \"sbom\",
    \"path_or_uri\": \"s3://artifacts/sbom-$(date +%s).json\",
    \"content_hash\": \"sha256:a1b2c3d4...\",
    \"metadata_json\": {
      \"sbom_present\": true,
      \"slsa_provenance_present\": true,
      \"risk_assessment_present\": true
    }
  }"
```

### Create a Disclosure Pack

```bash
# Get artifact IDs first
ARTIFACT_IDS=$(curl -s http://localhost:8001/maestro/artifacts?run_id=$RUN_ID | jq -r '.[].id' | jq -R -s -c 'split("\n") | map(select(length > 0))')

curl -X POST http://localhost:8001/maestro/disclosure-packs \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"summary\": \"Complete analysis with SBOM, SLSA provenance, and risk assessment\",
    \"artifact_ids\": $ARTIFACT_IDS
  }"
```

### Fetch Run Manifest

```bash
curl http://localhost:8001/maestro/runs/$RUN_ID/manifest | jq
```

**Response includes:**
- Run details
- All artifacts
- Disclosure pack (if created)
- Compliance report

### Check Release Gate

```bash
# Update run to succeeded first
curl -X PATCH http://localhost:8001/maestro/runs/$RUN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "succeeded",
    "cost_actual": 8.50,
    "finished_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Check release gate
curl http://localhost:8001/maestro/runs/$RUN_ID/release-gate | jq
```

**Passing Response:**
```json
{
  "run_id": "abc-123-def-456",
  "passed": true,
  "message": "Release gate passed: 1 compliant artifact(s) found",
  "details": {
    "total_artifacts": 1,
    "compliant_artifacts": 1,
    "compliant_artifact_ids": ["art-789"]
  }
}
```

## Complete Workflow Example

```bash
# 1. Create run
RUN=$(curl -s -X POST http://localhost:8001/maestro/runs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production deployment check",
    "owner": "devops@example.com",
    "cost_estimate": 5.0
  }')
RUN_ID=$(echo $RUN | jq -r '.id')
echo "Created run: $RUN_ID"

# 2. Attach compliant artifact
curl -s -X POST http://localhost:8001/maestro/artifacts \
  -H "Content-Type: application/json" \
  -d "{
    \"run_id\": \"$RUN_ID\",
    \"kind\": \"other\",
    \"path_or_uri\": \"s3://releases/bundle-v1.0.0.tgz\",
    \"content_hash\": \"sha256:$(openssl rand -hex 32)\",
    \"metadata_json\": {
      \"sbom_present\": true,
      \"slsa_provenance_present\": true,
      \"risk_assessment_present\": true
    }
  }" > /dev/null

# 3. Update run to succeeded
curl -s -X PATCH http://localhost:8001/maestro/runs/$RUN_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"succeeded\",
    \"cost_actual\": 4.25,
    \"finished_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" > /dev/null

# 4. Check release gate
echo "Checking release gate..."
curl -s http://localhost:8001/maestro/runs/$RUN_ID/release-gate | jq

# 5. Get full manifest
echo "Fetching manifest..."
curl -s http://localhost:8001/maestro/runs/$RUN_ID/manifest | jq '.compliance_report'
```

## Using HTTPie (Alternative)

If you prefer HTTPie over curl:

```bash
# Create run
http POST localhost:8001/maestro/runs \
  name="Test run" \
  owner="user@example.com" \
  cost_estimate:=10.0

# Create artifact
http POST localhost:8001/maestro/artifacts \
  run_id="abc-123" \
  kind="sbom" \
  path_or_uri="s3://test/sbom.json" \
  metadata_json:='{"sbom_present": true, "slsa_provenance_present": true, "risk_assessment_present": true}'

# Get manifest
http GET localhost:8001/maestro/runs/abc-123/manifest
```

## Release Gate Requirements

For a run to pass the release gate:

1. ✅ Run status = `succeeded`
2. ✅ At least one artifact with **all three flags** set to `true`:
   - `sbom_present`
   - `slsa_provenance_present`
   - `risk_assessment_present`

**Tip**: Create a single "bundle" artifact with all three compliance components rather than separate artifacts for each.

## Integration with IntelGraph

Link runs to IntelGraph entities and decisions:

```bash
curl -X POST http://localhost:8001/maestro/runs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Entity resolution - John Doe",
    "owner": "analyst@example.com",
    "related_entity_ids": ["person-uuid-123", "org-uuid-456"],
    "related_decision_ids": ["decision-uuid-789"]
  }'
```

These IDs should reference entities and decisions from the IntelGraph MVP.

## Next Steps

- **Full Docs**: See `docs/maestro_minimal.md`
- **IntelGraph MVP**: See `intelgraph-mvp/api/`
- **Test Suite**: See `tests/maestro/test_maestro.py`

## Troubleshooting

**Problem**: Import errors when running tests

**Solution**: Ensure you're running from the summit root:
```bash
cd /home/user/summit
pytest tests/maestro/ -v
```

**Problem**: Port 8001 already in use

**Solution**: Stop existing process or use different port:
```bash
python -m uvicorn maestro.app:app --host 0.0.0.0 --port 8002 --reload
```

**Problem**: Release gate fails

**Solution**: Check compliance report for details:
```bash
curl http://localhost:8001/maestro/runs/$RUN_ID/manifest | jq '.compliance_report'
```
