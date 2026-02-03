import os
import sys
import unittest
from datetime import datetime
from unittest.mock import MagicMock

# Add repo root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from maestro.models import Artifact, ArtifactKind, Run
from maestro.provenance.exporter import ProvenanceExporter


class TestProvenanceExporter(unittest.TestCase):
    def test_export_run(self):
        # Skip if prov not installed
        try:
            import prov
        except ImportError:
            self.skipTest("prov library not installed")

        exporter = ProvenanceExporter()

        run = Run(
            id="run-123",
            name="Test Run",
            owner="user@example.com",
            started_at=datetime.utcnow()
        )

        artifact = Artifact(
            id="art-456",
            run_id="run-123",
            kind=ArtifactKind.SBOM,
            path_or_uri="s3://bucket/sbom.json",
            content_hash="sha256:1234"
        )

        doc = exporter.export_run(run, [artifact])

        self.assertIsNotNone(doc)
        # Verify serialization works
        json_output = doc.serialize(format='json')
        self.assertIn("maestro:run/run-123", json_output)
        self.assertIn("maestro:artifact/art-456", json_output)
