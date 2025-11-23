"""
Tests for Maestro subsystem: runs, artifacts, and disclosure packs.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.maestro import ArtifactKind, ArtifactMetadata, RunStatus

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_maestro_storage():
    """Clear Maestro storage before each test."""
    from app.routers.maestro import artifacts_db, disclosure_packs_db, runs_db

    runs_db.clear()
    artifacts_db.clear()
    disclosure_packs_db.clear()
    yield


def test_create_run():
    """Test creating a new run."""
    response = client.post(
        "/maestro/runs",
        json={
            "name": "Test Run",
            "owner": "test-user",
            "cost_estimate": 100.0,
            "related_entity_ids": ["entity-1", "entity-2"],
            "related_decision_ids": ["decision-1"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Run"
    assert data["owner"] == "test-user"
    assert data["cost_estimate"] == 100.0
    assert data["status"] == "pending"
    assert data["related_entity_ids"] == ["entity-1", "entity-2"]
    assert data["related_decision_ids"] == ["decision-1"]
    assert "id" in data
    assert "started_at" in data


def test_list_runs():
    """Test listing runs."""
    # Create multiple runs
    client.post("/maestro/runs", json={"name": "Run 1", "owner": "alice"})
    client.post("/maestro/runs", json={"name": "Run 2", "owner": "bob"})
    client.post("/maestro/runs", json={"name": "Run 3", "owner": "alice"})

    # List all runs
    response = client.get("/maestro/runs")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    # Filter by owner
    response = client.get("/maestro/runs?owner=alice")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(r["owner"] == "alice" for r in data)


def test_get_run():
    """Test getting a specific run."""
    # Create a run
    create_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = create_response.json()["id"]

    # Get the run
    response = client.get(f"/maestro/runs/{run_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == run_id
    assert data["name"] == "Test Run"

    # Try to get non-existent run
    response = client.get("/maestro/runs/non-existent")
    assert response.status_code == 404


def test_update_run():
    """Test updating a run."""
    # Create a run
    create_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = create_response.json()["id"]

    # Update the run
    response = client.patch(
        f"/maestro/runs/{run_id}",
        json={
            "status": "completed",
            "cost_actual": 95.5,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["cost_actual"] == 95.5


def test_create_artifact():
    """Test creating an artifact."""
    # Create a run first
    run_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = run_response.json()["id"]

    # Create an artifact
    response = client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "sbom",
            "path_or_uri": "s3://bucket/sbom.json",
            "content_hash": "sha256:abc123",
            "metadata_json": {
                "sbom_present": True,
                "slsa_provenance_present": False,
                "risk_assessment_present": False,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == run_id
    assert data["kind"] == "sbom"
    assert data["path_or_uri"] == "s3://bucket/sbom.json"
    assert data["content_hash"] == "sha256:abc123"
    assert data["metadata_json"]["sbom_present"] is True


def test_create_artifact_invalid_run():
    """Test creating an artifact with invalid run ID."""
    response = client.post(
        "/maestro/artifacts",
        json={
            "run_id": "non-existent",
            "kind": "sbom",
            "path_or_uri": "s3://bucket/sbom.json",
            "content_hash": "sha256:abc123",
        },
    )
    assert response.status_code == 404


def test_list_artifacts():
    """Test listing artifacts for a run."""
    # Create a run
    run_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = run_response.json()["id"]

    # Create multiple artifacts
    for i in range(3):
        client.post(
            "/maestro/artifacts",
            json={
                "run_id": run_id,
                "kind": "log",
                "path_or_uri": f"s3://bucket/log-{i}.txt",
                "content_hash": f"sha256:hash{i}",
            },
        )

    # List artifacts
    response = client.get(f"/maestro/runs/{run_id}/artifacts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


def test_create_disclosure_pack():
    """Test creating a disclosure pack."""
    # Create a run
    run_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = run_response.json()["id"]

    # Create artifacts
    artifact_ids = []
    for kind in ["sbom", "slsa_provenance", "risk_assessment"]:
        artifact_response = client.post(
            "/maestro/artifacts",
            json={
                "run_id": run_id,
                "kind": kind,
                "path_or_uri": f"s3://bucket/{kind}.json",
                "content_hash": f"sha256:{kind}",
            },
        )
        artifact_ids.append(artifact_response.json()["id"])

    # Create disclosure pack
    response = client.post(
        "/maestro/disclosure-packs",
        json={
            "run_id": run_id,
            "summary": "Complete disclosure pack with all artifacts",
            "artifact_ids": artifact_ids,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == run_id
    assert data["summary"] == "Complete disclosure pack with all artifacts"
    assert len(data["artifact_ids"]) == 3


def test_get_disclosure_pack():
    """Test getting a disclosure pack for a run."""
    # Create a run
    run_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = run_response.json()["id"]

    # Create disclosure pack
    client.post(
        "/maestro/disclosure-packs",
        json={
            "run_id": run_id,
            "summary": "Test pack",
            "artifact_ids": [],
        },
    )

    # Get disclosure pack
    response = client.get(f"/maestro/runs/{run_id}/disclosure-pack")
    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == run_id
    assert data["summary"] == "Test pack"


def test_run_manifest_with_release_gate():
    """Test getting run manifest with release gate validation."""
    # Create a run
    run_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = run_response.json()["id"]

    # Create artifacts with all required governance flags
    client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "sbom",
            "path_or_uri": "s3://bucket/sbom.json",
            "content_hash": "sha256:sbom",
            "metadata_json": {
                "sbom_present": True,
                "slsa_provenance_present": False,
                "risk_assessment_present": False,
            },
        },
    )
    client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "slsa_provenance",
            "path_or_uri": "s3://bucket/slsa.json",
            "content_hash": "sha256:slsa",
            "metadata_json": {
                "sbom_present": False,
                "slsa_provenance_present": True,
                "risk_assessment_present": False,
            },
        },
    )
    client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "risk_assessment",
            "path_or_uri": "s3://bucket/risk.json",
            "content_hash": "sha256:risk",
            "metadata_json": {
                "sbom_present": False,
                "slsa_provenance_present": False,
                "risk_assessment_present": True,
            },
        },
    )

    # Get manifest
    response = client.get(f"/maestro/runs/{run_id}/manifest")
    assert response.status_code == 200
    data = response.json()
    assert data["run"]["id"] == run_id
    assert len(data["artifacts"]) == 3
    assert data["release_gate_passed"] is True


def test_run_manifest_fails_release_gate():
    """Test that run manifest fails release gate when missing artifacts."""
    # Create a run
    run_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = run_response.json()["id"]

    # Create only SBOM artifact (missing SLSA and risk assessment)
    client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "sbom",
            "path_or_uri": "s3://bucket/sbom.json",
            "content_hash": "sha256:sbom",
            "metadata_json": {
                "sbom_present": True,
                "slsa_provenance_present": False,
                "risk_assessment_present": False,
            },
        },
    )

    # Get manifest
    response = client.get(f"/maestro/runs/{run_id}/manifest")
    assert response.status_code == 200
    data = response.json()
    assert data["release_gate_passed"] is False


def test_run_summary():
    """Test getting run summary with artifact counts."""
    # Create a run
    run_response = client.post(
        "/maestro/runs", json={"name": "Test Run", "owner": "test-user"}
    )
    run_id = run_response.json()["id"]

    # Create various artifacts
    for kind in ["sbom", "log", "report"]:
        client.post(
            "/maestro/artifacts",
            json={
                "run_id": run_id,
                "kind": kind,
                "path_or_uri": f"s3://bucket/{kind}.json",
                "content_hash": f"sha256:{kind}",
                "metadata_json": {
                    "sbom_present": kind == "sbom",
                    "slsa_provenance_present": False,
                    "risk_assessment_present": False,
                },
            },
        )

    # Get summary
    response = client.get(f"/maestro/runs/{run_id}/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == run_id
    assert data["artifacts"]["total_artifacts"] == 3
    assert data["artifacts"]["governance"]["sbom_count"] == 1
    assert "release_gate" in data


def test_health_endpoint():
    """Test Maestro health endpoint."""
    response = client.get("/maestro/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "runs_count" in data
    assert "artifacts_count" in data
    assert "disclosure_packs_count" in data


def test_complete_workflow():
    """Test complete workflow: create run → attach artifacts → generate disclosure pack → validate."""
    # Step 1: Create a run
    run_response = client.post(
        "/maestro/runs",
        json={
            "name": "Production Release v1.0",
            "owner": "release-team",
            "cost_estimate": 500.0,
            "related_entity_ids": ["app-service", "db-service"],
            "related_decision_ids": ["decision-release-001"],
        },
    )
    assert run_response.status_code == 200
    run_id = run_response.json()["id"]

    # Step 2: Attach artifacts with governance metadata
    artifact_ids = []

    # SBOM artifact
    sbom_response = client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "sbom",
            "path_or_uri": "s3://releases/v1.0/sbom.json",
            "content_hash": "sha256:abc123def456",
            "metadata_json": {
                "sbom_present": True,
                "slsa_provenance_present": False,
                "risk_assessment_present": False,
            },
        },
    )
    assert sbom_response.status_code == 200
    artifact_ids.append(sbom_response.json()["id"])

    # SLSA provenance artifact
    slsa_response = client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "slsa_provenance",
            "path_or_uri": "s3://releases/v1.0/slsa-provenance.json",
            "content_hash": "sha256:789ghi012jkl",
            "metadata_json": {
                "sbom_present": False,
                "slsa_provenance_present": True,
                "risk_assessment_present": False,
            },
        },
    )
    assert slsa_response.status_code == 200
    artifact_ids.append(slsa_response.json()["id"])

    # Risk assessment artifact
    risk_response = client.post(
        "/maestro/artifacts",
        json={
            "run_id": run_id,
            "kind": "risk_assessment",
            "path_or_uri": "s3://releases/v1.0/risk-assessment.pdf",
            "content_hash": "sha256:345mno678pqr",
            "metadata_json": {
                "sbom_present": False,
                "slsa_provenance_present": False,
                "risk_assessment_present": True,
            },
        },
    )
    assert risk_response.status_code == 200
    artifact_ids.append(risk_response.json()["id"])

    # Step 3: Create disclosure pack
    pack_response = client.post(
        "/maestro/disclosure-packs",
        json={
            "run_id": run_id,
            "summary": "Production release v1.0 with complete SBOM, SLSA provenance, and risk assessment",
            "artifact_ids": artifact_ids,
        },
    )
    assert pack_response.status_code == 200
    pack_id = pack_response.json()["id"]

    # Step 4: Validate release gate
    manifest_response = client.get(f"/maestro/runs/{run_id}/manifest")
    assert manifest_response.status_code == 200
    manifest = manifest_response.json()

    # Assertions
    assert manifest["run"]["id"] == run_id
    assert len(manifest["artifacts"]) == 3
    assert manifest["disclosure_pack"]["id"] == pack_id
    assert manifest["release_gate_passed"] is True

    # Step 5: Update run to completed
    update_response = client.patch(
        f"/maestro/runs/{run_id}",
        json={
            "status": "completed",
            "cost_actual": 475.0,
        },
    )
    assert update_response.status_code == 200

    # Final verification
    final_response = client.get(f"/maestro/runs/{run_id}")
    assert final_response.status_code == 200
    final_run = final_response.json()
    assert final_run["status"] == "completed"
    assert final_run["cost_actual"] == 475.0
