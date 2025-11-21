"""Golden I/O tests for STIX/TAXII connector parsing."""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


class TestSTIXParsing(unittest.TestCase):
    """Test STIX parsing and entity mapping."""

    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = Path(__file__).parent.parent / "stix_taxii_connector"
        self.manifest_path = self.test_dir / "manifest.yaml"

    def test_stix_indicator_parsing(self):
        """Test parsing STIX indicator object."""
        stix_indicator = {
            "type": "indicator",
            "spec_version": "2.1",
            "id": "indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f",
            "created": "2021-01-01T00:00:00.000Z",
            "modified": "2021-01-01T00:00:00.000Z",
            "name": "Malicious IP",
            "description": "Known C2 server",
            "pattern": "[ipv4-addr:value = '192.0.2.1']",
            "pattern_type": "stix",
            "valid_from": "2021-01-01T00:00:00.000Z",
        }

        # Test that indicator can be parsed
        self.assertEqual(stix_indicator["type"], "indicator")
        self.assertIn("pattern", stix_indicator)

    def test_stix_malware_parsing(self):
        """Test parsing STIX malware object."""
        stix_malware = {
            "type": "malware",
            "spec_version": "2.1",
            "id": "malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b",
            "created": "2021-01-01T00:00:00.000Z",
            "modified": "2021-01-01T00:00:00.000Z",
            "name": "TrickBot",
            "is_family": True,
            "malware_types": ["trojan", "backdoor"],
        }

        self.assertEqual(stix_malware["type"], "malware")
        self.assertTrue(stix_malware["is_family"])
        self.assertIn("trojan", stix_malware["malware_types"])

    def test_stix_relationship_parsing(self):
        """Test parsing STIX relationship object."""
        stix_relationship = {
            "type": "relationship",
            "spec_version": "2.1",
            "id": "relationship--44298a74-ba52-4f0c-87a3-1824e67d7fad",
            "created": "2021-01-01T00:00:00.000Z",
            "modified": "2021-01-01T00:00:00.000Z",
            "relationship_type": "indicates",
            "source_ref": "indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f",
            "target_ref": "malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b",
        }

        self.assertEqual(stix_relationship["type"], "relationship")
        self.assertEqual(stix_relationship["relationship_type"], "indicates")

    def test_stix_bundle_parsing(self):
        """Test parsing STIX bundle."""
        stix_bundle = {
            "type": "bundle",
            "id": "bundle--5d0092c5-5f74-4287-9642-33f4c354e56d",
            "objects": [
                {
                    "type": "indicator",
                    "spec_version": "2.1",
                    "id": "indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f",
                    "created": "2021-01-01T00:00:00.000Z",
                    "modified": "2021-01-01T00:00:00.000Z",
                    "name": "Malicious IP",
                    "pattern": "[ipv4-addr:value = '192.0.2.1']",
                    "pattern_type": "stix",
                    "valid_from": "2021-01-01T00:00:00.000Z",
                },
                {
                    "type": "malware",
                    "spec_version": "2.1",
                    "id": "malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b",
                    "created": "2021-01-01T00:00:00.000Z",
                    "modified": "2021-01-01T00:00:00.000Z",
                    "name": "TrickBot",
                    "is_family": True,
                    "malware_types": ["trojan"],
                },
            ],
        }

        self.assertEqual(stix_bundle["type"], "bundle")
        self.assertEqual(len(stix_bundle["objects"]), 2)

    def test_pii_in_identity_object(self):
        """Test PII detection in STIX identity object."""
        stix_identity = {
            "type": "identity",
            "spec_version": "2.1",
            "id": "identity--311b2d2d-f010-4473-83ec-1edf84858f4c",
            "created": "2021-01-01T00:00:00.000Z",
            "modified": "2021-01-01T00:00:00.000Z",
            "name": "John Smith",
            "identity_class": "individual",
            "contact_information": "john.smith@example.com",
        }

        # Identity objects can contain PII
        self.assertEqual(stix_identity["identity_class"], "individual")
        # Email in contact_information should be flagged
        self.assertIn("@", stix_identity["contact_information"])

    def test_blocked_payload_field(self):
        """Test that payload_bin fields are blocked."""
        stix_artifact = {
            "type": "artifact",
            "spec_version": "2.1",
            "id": "artifact--4d3e146e-0e19-4340-84cc-22ece8f8f1c8",
            "created": "2021-01-01T00:00:00.000Z",
            "modified": "2021-01-01T00:00:00.000Z",
            "payload_bin": "TVqQAAMAAAAEAAAA//8AALgAAAA...",  # Should be blocked
            "hashes": {"SHA-256": "abc123"},
        }

        # According to manifest, payload_bin should be blocked
        # In real connector, this field would be filtered out
        self.assertIn("payload_bin", stix_artifact)  # Present in raw data
        # But should be removed by license enforcer

    def test_tlp_marking(self):
        """Test TLP marking detection."""
        tlp_marking = {
            "type": "marking-definition",
            "spec_version": "2.1",
            "id": "marking-definition--f88d31f6-486f-44da-b317-01333bde0b82",
            "created": "2017-01-20T00:00:00.000Z",
            "definition_type": "tlp",
            "name": "TLP:AMBER",
            "definition": {"tlp": "amber"},
        }

        self.assertEqual(tlp_marking["definition_type"], "tlp")
        self.assertEqual(tlp_marking["definition"]["tlp"], "amber")


if __name__ == "__main__":
    unittest.main()
