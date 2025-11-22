"""Integration tests for Maestro runs, artifacts, and disclosure packs."""

from datetime import datetime

import pytest

from maestro.checks import check_release_gate, generate_compliance_report
from maestro.models import (
    Artifact,
    ArtifactKind,
    ArtifactMetadata,
    DisclosurePack,
    Run,
    RunStatus,
)


class TestRunOperations:
    """Test run creation and management."""

    def test_create_run(self, client, sample_run_data):
        """Test creating a new run via API."""
        response = client.post("/maestro/runs", json=sample_run_data)
        assert response.status_code == 201

        run = response.json()
        assert run["name"] == sample_run_data["name"]
        assert run["owner"] == sample_run_data["owner"]
        assert run["status"] == "pending"
        assert "id" in run
        assert run["related_entity_ids"] == sample_run_data["related_entity_ids"]
        assert run["related_decision_ids"] == sample_run_data["related_decision_ids"]

    def test_get_run(self, client, sample_run_data):
        """Test retrieving a run by ID."""
        # Create run
        create_response = client.post("/maestro/runs", json=sample_run_data)
        run_id = create_response.json()["id"]

        # Get run
        response = client.get(f"/maestro/runs/{run_id}")
        assert response.status_code == 200
        assert response.json()["id"] == run_id

    def test_list_runs(self, client, sample_run_data):
        """Test listing all runs."""
        # Create multiple runs
        client.post("/maestro/runs", json=sample_run_data)
        client.post(
            "/maestro/runs", json={**sample_run_data, "owner": "other@example.com"}
        )

        # List all runs
        response = client.get("/maestro/runs")
        assert response.status_code == 200
        runs = response.json()
        assert len(runs) >= 2

    def test_list_runs_filtered_by_owner(self, client, sample_run_data):
        """Test filtering runs by owner."""
        owner1 = "analyst1@example.com"
        owner2 = "analyst2@example.com"

        client.post("/maestro/runs", json={**sample_run_data, "owner": owner1})
        client.post("/maestro/runs", json={**sample_run_data, "owner": owner2})

        response = client.get(f"/maestro/runs?owner={owner1}")
        assert response.status_code == 200
        runs = response.json()
        assert all(r["owner"] == owner1 for r in runs)

    def test_update_run(self, client, sample_run_data):
        """Test updating a run's status and cost."""
        # Create run
        create_response = client.post("/maestro/runs", json=sample_run_data)
        run_id = create_response.json()["id"]

        # Update run
        update_data = {
            "status": "succeeded",
            "cost_actual": 8.50,
            "finished_at": datetime.utcnow().isoformat(),
        }
        response = client.patch(f"/maestro/runs/{run_id}", json=update_data)
        assert response.status_code == 200

        updated = response.json()
        assert updated["status"] == "succeeded"
        assert updated["cost_actual"] == 8.50
        assert updated["finished_at"] is not None


class TestArtifactOperations:
    """Test artifact creation and management."""

    def test_create_artifact(self, client, sample_run_data, sample_artifact_metadata):
        """Test attaching an artifact to a run."""
        # Create run first
        run_response = client.post("/maestro/runs", json=sample_run_data)
        run_id = run_response.json()["id"]

        # Create artifact
        artifact_data = {
            "run_id": run_id,
            "kind": "sbom",
            "path_or_uri": "s3://artifacts/sbom.json",
            "content_hash": "sha256:abc123",
            "metadata_json": sample_artifact_metadata,
        }
        response = client.post("/maestro/artifacts", json=artifact_data)
        assert response.status_code == 201

        artifact = response.json()
        assert artifact["run_id"] == run_id
        assert artifact["kind"] == "sbom"
        assert artifact["metadata_json"]["sbom_present"] is True

    def test_create_artifact_nonexistent_run(self, client, sample_artifact_metadata):
        """Test creating artifact with non-existent run fails."""
        artifact_data = {
            "run_id": "nonexistent-run-id",
            "kind": "sbom",
            "path_or_uri": "s3://artifacts/sbom.json",
            "metadata_json": sample_artifact_metadata,
        }
        response = client.post("/maestro/artifacts", json=artifact_data)
        assert response.status_code == 404

    def test_list_artifacts(self, client, sample_run_data, sample_artifact_metadata):
        """Test listing artifacts for a run."""
        # Create run
        run_response = client.post("/maestro/runs", json=sample_run_data)
        run_id = run_response.json()["id"]

        # Create multiple artifacts
        for kind in ["sbom", "slsa_provenance", "risk_assessment"]:
            artifact_data = {
                "run_id": run_id,
                "kind": kind,
                "path_or_uri": f"s3://artifacts/{kind}.json",
                "metadata_json": sample_artifact_metadata,
            }
            client.post("/maestro/artifacts", json=artifact_data)

        # List artifacts for run
        response = client.get(f"/maestro/artifacts?run_id={run_id}")
        assert response.status_code == 200
        artifacts = response.json()
        assert len(artifacts) == 3


class TestDisclosurePackOperations:
    """Test disclosure pack creation and retrieval."""

    def test_create_disclosure_pack(
        self, client, sample_run_data, sample_artifact_metadata
    ):
        """Test creating a disclosure pack for a run."""
        # Create run
        run_response = client.post("/maestro/runs", json=sample_run_data)
        run_id = run_response.json()["id"]

        # Create artifacts
        artifact_ids = []
        for kind in ["sbom", "slsa_provenance", "risk_assessment"]:
            artifact_response = client.post(
                "/maestro/artifacts",
                json={
                    "run_id": run_id,
                    "kind": kind,
                    "path_or_uri": f"s3://artifacts/{kind}.json",
                    "metadata_json": sample_artifact_metadata,
                },
            )
            artifact_ids.append(artifact_response.json()["id"])

        # Create disclosure pack
        pack_data = {
            "run_id": run_id,
            "summary": "Complete analysis with SBOM, provenance, and risk assessment",
            "artifact_ids": artifact_ids,
        }
        response = client.post("/maestro/disclosure-packs", json=pack_data)
        assert response.status_code == 201

        pack = response.json()
        assert pack["run_id"] == run_id
        assert len(pack["artifact_ids"]) == 3
        assert pack["summary"] == pack_data["summary"]

    def test_get_run_manifest(self, client, sample_run_data, sample_artifact_metadata):
        """Test retrieving complete run manifest."""
        # Create run
        run_response = client.post("/maestro/runs", json=sample_run_data)
        run_id = run_response.json()["id"]

        # Update to succeeded
        client.patch(
            f"/maestro/runs/{run_id}",
            json={"status": "succeeded", "finished_at": datetime.utcnow().isoformat()},
        )

        # Create artifacts
        artifact_ids = []
        for kind in ["sbom", "slsa_provenance", "risk_assessment"]:
            artifact_response = client.post(
                "/maestro/artifacts",
                json={
                    "run_id": run_id,
                    "kind": kind,
                    "path_or_uri": f"s3://artifacts/{kind}.json",
                    "metadata_json": sample_artifact_metadata,
                },
            )
            artifact_ids.append(artifact_response.json()["id"])

        # Create disclosure pack
        pack_data = {
            "run_id": run_id,
            "summary": "Complete analysis",
            "artifact_ids": artifact_ids,
        }
        client.post("/maestro/disclosure-packs", json=pack_data)

        # Get manifest
        response = client.get(f"/maestro/runs/{run_id}/manifest")
        assert response.status_code == 200

        manifest = response.json()
        assert "run" in manifest
        assert "artifacts" in manifest
        assert "disclosure_pack" in manifest
        assert "compliance_report" in manifest
        assert len(manifest["artifacts"]) == 3
        assert manifest["disclosure_pack"] is not None


class TestReleaseGate:
    """Test release gate validation logic."""

    def test_release_gate_passes(
        self, maestro_store, sample_run_data, sample_artifact_metadata
    ):
        """Test release gate passes with compliant artifacts."""
        # Create run
        run = Run(**sample_run_data, status=RunStatus.SUCCEEDED)
        maestro_store.create_run(run)

        # Create compliant artifact
        artifact = Artifact(
            run_id=run.id,
            kind=ArtifactKind.SBOM,
            path_or_uri="s3://test/sbom.json",
            metadata_json=ArtifactMetadata(**sample_artifact_metadata),
        )
        maestro_store.create_artifact(artifact)

        # Check release gate
        result = check_release_gate(maestro_store, run.id)
        assert result.passed is True
        assert "compliant" in result.message.lower()

    def test_release_gate_fails_no_artifacts(self, maestro_store, sample_run_data):
        """Test release gate fails when no artifacts exist."""
        # Create run
        run = Run(**sample_run_data, status=RunStatus.SUCCEEDED)
        maestro_store.create_run(run)

        # Check release gate
        result = check_release_gate(maestro_store, run.id)
        assert result.passed is False
        assert "no artifacts" in result.message.lower()

    def test_release_gate_fails_incomplete_metadata(
        self, maestro_store, sample_run_data
    ):
        """Test release gate fails with incomplete metadata."""
        # Create run
        run = Run(**sample_run_data, status=RunStatus.SUCCEEDED)
        maestro_store.create_run(run)

        # Create artifact with incomplete metadata
        artifact = Artifact(
            run_id=run.id,
            kind=ArtifactKind.SBOM,
            path_or_uri="s3://test/sbom.json",
            metadata_json=ArtifactMetadata(
                sbom_present=True,
                slsa_provenance_present=False,  # Missing!
                risk_assessment_present=True,
            ),
        )
        maestro_store.create_artifact(artifact)

        # Check release gate
        result = check_release_gate(maestro_store, run.id)
        assert result.passed is False
        assert "compliance" in result.message.lower()

    def test_release_gate_fails_run_not_succeeded(
        self, maestro_store, sample_run_data, sample_artifact_metadata
    ):
        """Test release gate fails if run hasn't succeeded."""
        # Create run in pending state
        run = Run(**sample_run_data, status=RunStatus.PENDING)
        maestro_store.create_run(run)

        # Create compliant artifact
        artifact = Artifact(
            run_id=run.id,
            kind=ArtifactKind.SBOM,
            path_or_uri="s3://test/sbom.json",
            metadata_json=ArtifactMetadata(**sample_artifact_metadata),
        )
        maestro_store.create_artifact(artifact)

        # Check release gate
        result = check_release_gate(maestro_store, run.id)
        assert result.passed is False
        assert "status" in result.message.lower()

    def test_compliance_report(self, maestro_store, sample_run_data):
        """Test compliance report generation."""
        # Create run
        run = Run(**sample_run_data, status=RunStatus.SUCCEEDED)
        maestro_store.create_run(run)

        # Create mixed artifacts
        compliant_artifact = Artifact(
            run_id=run.id,
            kind=ArtifactKind.SBOM,
            path_or_uri="s3://test/sbom.json",
            metadata_json=ArtifactMetadata(
                sbom_present=True,
                slsa_provenance_present=True,
                risk_assessment_present=True,
            ),
        )
        maestro_store.create_artifact(compliant_artifact)

        non_compliant_artifact = Artifact(
            run_id=run.id,
            kind=ArtifactKind.BUILD_LOG,
            path_or_uri="s3://test/build.log",
            metadata_json=ArtifactMetadata(
                sbom_present=False,
                slsa_provenance_present=False,
                risk_assessment_present=False,
            ),
        )
        maestro_store.create_artifact(non_compliant_artifact)

        # Generate report
        report = generate_compliance_report(maestro_store, run.id)

        assert report["run_id"] == run.id
        assert report["run_status"] == "succeeded"
        assert report["summary"]["total_artifacts"] == 2
        assert report["summary"]["compliant_artifacts"] == 1
        assert len(report["artifacts"]) == 2

    def test_release_gate_via_api(
        self, client, sample_run_data, sample_artifact_metadata
    ):
        """Test release gate check via API endpoint."""
        # Create run
        run_response = client.post("/maestro/runs", json=sample_run_data)
        run_id = run_response.json()["id"]

        # Update to succeeded
        client.patch(
            f"/maestro/runs/{run_id}",
            json={"status": "succeeded", "finished_at": datetime.utcnow().isoformat()},
        )

        # Create compliant artifact
        client.post(
            "/maestro/artifacts",
            json={
                "run_id": run_id,
                "kind": "sbom",
                "path_or_uri": "s3://test/sbom.json",
                "metadata_json": sample_artifact_metadata,
            },
        )

        # Check release gate
        response = client.get(f"/maestro/runs/{run_id}/release-gate")
        assert response.status_code == 200

        result = response.json()
        assert result["passed"] is True
        assert result["run_id"] == run_id
