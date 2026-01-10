import json
import os
import sys
import uuid
from datetime import datetime
from unittest.mock import patch

import pytest

# Ensure we can import the app
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app import claims, disclosure, evidence, provenance

GOLDEN_FILE = os.path.join(os.path.dirname(__file__), "golden_bundle.json")


@pytest.fixture
def reset_store():
    provenance._graph.clear()
    claims._claims.clear()
    evidence._evidence.clear()
    disclosure._bundles.clear()
    disclosure._manifests.clear()
    yield
    provenance._graph.clear()
    claims._claims.clear()
    evidence._evidence.clear()
    disclosure._bundles.clear()
    disclosure._manifests.clear()


def test_golden_bundle_manifest(reset_store):
    # Fixed values
    ids = [
        uuid.UUID("11111111-1111-1111-1111-111111111111"),  # Evidence
        uuid.UUID("22222222-2222-2222-2222-222222222222"),  # Claim
        uuid.UUID("33333333-3333-3333-3333-333333333333"),  # Bundle
    ]
    fixed_time = datetime(2023, 10, 27, 12, 0, 0)

    # We patch where they are imported or used.
    # Note: claims.py imports datetime, evidence.py imports datetime.
    # We need to patch 'app.claims.datetime', 'app.evidence.datetime'.

    with (
        patch("uuid.uuid4", side_effect=ids),
        patch("app.claims.datetime") as mock_dt_claims,
        patch("app.evidence.datetime") as mock_dt_evidence,
        patch("app.claims.embed", return_value=[0.1, 0.2]),
    ):
        mock_dt_claims.utcnow.return_value = fixed_time
        mock_dt_evidence.utcnow.return_value = fixed_time

        # Create Evidence
        # Evidence uses uuid.uuid4() -> ID 1
        ev1 = evidence.register_evidence("doc", url="http://example.com/1", title="Doc 1")
        provenance.add_evidence(ev1)

        # Create Claim
        # Claim uses uuid.uuid4() -> ID 2
        text = "The sky is blue"
        claim = claims.create_claim(text)
        provenance.add_claim(claim)
        provenance.attach(claim["id"], ev1["id"])

        # Build Bundle
        # Bundle uses uuid.uuid4() -> ID 3
        bundle = disclosure.build_bundle([claim["id"]])

        # Determine Golden File Content
        if not os.path.exists(GOLDEN_FILE):
            with open(GOLDEN_FILE, "w") as f:
                json.dump(bundle, f, indent=2, sort_keys=True)

        with open(GOLDEN_FILE) as f:
            golden = json.load(f)

        assert bundle == golden


def test_cli_verification():
    from app import cli

    # Ensure golden file exists
    assert os.path.exists(GOLDEN_FILE)
    ok, diffs = cli.verify_bundle(GOLDEN_FILE)
    assert ok
    assert not diffs


def test_grpc_service_import():
    try:
        from app.grpc_server import ProvenanceService
    except ImportError as e:
        pytest.fail(f"Could not import ProvenanceService: {e}")


def test_grpc_service_structure():
    from app.grpc_server import ProvenanceService

    svc = ProvenanceService()
    mapping = svc.__mapping__()
    assert "/provenance.ProvenanceService/RegisterEvidence" in mapping
    assert "/provenance.ProvenanceService/GetProvenance" in mapping


def test_graphql_schema_snapshot():
    from app.graphql import schema

    # Basic snapshot verification by checking key types exist in printed schema
    s = str(schema)
    assert "type EvidenceType" in s
    assert "type BundleType" in s
    assert "type Mutation" in s
    assert "registerEvidence" in s
    assert "createDisclosureBundle" in s
