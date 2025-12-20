"""
Unit tests for CISA KEV schema mapping.

Tests the map_cisa_kev_to_intelgraph function and related utilities.
"""

import unittest
import json
import os
from pathlib import Path
from typing import List, Dict, Any

from connectors.cisa_kev.schema_mapping import (
    map_cisa_kev_to_intelgraph,
    get_ransomware_vulnerabilities,
    get_recent_vulnerabilities,
    _validate_kev_schema,
    _map_vulnerability_to_entity,
    _parse_ransomware_flag
)


class TestSchemaMapping(unittest.TestCase):
    """Unit tests for schema mapping logic."""

    @classmethod
    def setUpClass(cls):
        """Set up test fixtures."""
        cls.sample_file = str(
            Path(__file__).parent.parent / "sample.json"
        )

    def test_basic_mapping(self):
        """Test basic entity mapping from sample data."""
        entities, relationships = map_cisa_kev_to_intelgraph(self.sample_file)

        # Validate counts
        self.assertGreater(len(entities), 0, "Should return at least one entity")
        self.assertEqual(len(relationships), 0, "KEV has no relationships")

        # Validate entity structure
        entity = entities[0]
        self.assertIn("type", entity)
        self.assertEqual(entity["type"], "Vulnerability")
        self.assertIn("properties", entity)
        self.assertIn("_metadata", entity)

    def test_required_fields(self):
        """Test that all required fields are present."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)
        entity = entities[0]

        required_fields = [
            "id", "cve_id", "name", "vendor_project", "product",
            "vulnerability_name", "short_description", "date_added",
            "required_action", "known_ransomware_use", "source", "confidence"
        ]

        for field in required_fields:
            self.assertIn(
                field,
                entity["properties"],
                f"Missing required field: {field}"
            )

    def test_cve_id_mapping(self):
        """Test CVE ID mapping."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        # Check for known CVE from sample data
        cve_ids = [e["properties"]["cve_id"] for e in entities]
        self.assertIn("CVE-2021-44228", cve_ids, "Log4j CVE should be present")

    def test_ransomware_flag(self):
        """Test ransomware flag parsing."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        # Find Log4j vulnerability (known ransomware use)
        log4j = next(
            e for e in entities
            if e["properties"]["cve_id"] == "CVE-2021-44228"
        )
        self.assertTrue(
            log4j["properties"]["known_ransomware_use"],
            "Log4j should have known ransomware use"
        )

        # Find Outlook vulnerability (unknown ransomware use)
        outlook = next(
            e for e in entities
            if e["properties"]["cve_id"] == "CVE-2023-23397"
        )
        self.assertFalse(
            outlook["properties"]["known_ransomware_use"],
            "Outlook vulnerability should not have known ransomware use"
        )

    def test_parse_ransomware_flag(self):
        """Test ransomware flag parsing utility."""
        self.assertTrue(_parse_ransomware_flag("Known"))
        self.assertTrue(_parse_ransomware_flag("known"))
        self.assertTrue(_parse_ransomware_flag("KNOWN"))
        self.assertFalse(_parse_ransomware_flag("Unknown"))
        self.assertFalse(_parse_ransomware_flag("N/A"))
        self.assertFalse(_parse_ransomware_flag(""))

    def test_metadata_enrichment(self):
        """Test metadata enrichment."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)
        entity = entities[0]

        metadata = entity["_metadata"]
        self.assertIn("connector_name", metadata)
        self.assertEqual(metadata["connector_name"], "cisa-kev")
        self.assertIn("connector_version", metadata)
        self.assertIn("ingestion_timestamp", metadata)
        self.assertIn("source_url", metadata)

    def test_confidence_score(self):
        """Test confidence score (should be 1.0 for authoritative source)."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        for entity in entities:
            confidence = entity["properties"]["confidence"]
            self.assertEqual(
                confidence,
                1.0,
                "CISA KEV is authoritative, confidence should be 1.0"
            )

    def test_source_attribution(self):
        """Test source attribution."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        for entity in entities:
            source = entity["properties"]["source"]
            self.assertEqual(source, "cisa-kev")

    def test_filter_ransomware(self):
        """Test ransomware filtering."""
        all_entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)
        ransomware_entities, _ = map_cisa_kev_to_intelgraph(
            self.sample_file,
            config={"filter_ransomware": True}
        )

        # Should have fewer entities when filtering
        self.assertLess(len(ransomware_entities), len(all_entities))

        # All filtered entities should have ransomware flag
        for entity in ransomware_entities:
            self.assertTrue(
                entity["properties"]["known_ransomware_use"],
                "Filtered entities should have ransomware flag"
            )

    def test_include_metadata(self):
        """Test including raw record in metadata."""
        entities, _ = map_cisa_kev_to_intelgraph(
            self.sample_file,
            config={"include_metadata": True}
        )

        entity = entities[0]
        self.assertIn("raw_record", entity["_metadata"])
        self.assertIsInstance(entity["_metadata"]["raw_record"], dict)

    def test_malformed_data(self):
        """Test handling of malformed data."""
        # Missing required field
        with self.assertRaises(ValueError):
            _validate_kev_schema({
                "catalogVersion": "1.0",
                # Missing other required fields
            })

        # Invalid vulnerabilities type
        with self.assertRaises(ValueError):
            _validate_kev_schema({
                "catalogVersion": "1.0",
                "dateReleased": "2025-11-20",
                "count": 0,
                "vulnerabilities": "not a list"  # Should be list
            })

    def test_missing_file(self):
        """Test handling of missing file."""
        with self.assertRaises(FileNotFoundError):
            map_cisa_kev_to_intelgraph("/nonexistent/file.json")

    def test_invalid_json(self):
        """Test handling of invalid JSON."""
        import tempfile

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write("{ invalid json }")
            temp_path = f.name

        try:
            with self.assertRaises(ValueError):
                map_cisa_kev_to_intelgraph(temp_path)
        finally:
            os.unlink(temp_path)

    def test_get_ransomware_vulnerabilities(self):
        """Test convenience function for ransomware vulnerabilities."""
        vulns = get_ransomware_vulnerabilities(self.sample_file)

        self.assertGreater(len(vulns), 0)
        for vuln in vulns:
            self.assertTrue(vuln["properties"]["known_ransomware_use"])

    def test_entity_uniqueness(self):
        """Test that entity IDs are unique."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        ids = [e["properties"]["id"] for e in entities]
        unique_ids = set(ids)

        self.assertEqual(
            len(ids),
            len(unique_ids),
            "All entity IDs should be unique"
        )

    def test_vendor_product_mapping(self):
        """Test vendor and product field mapping."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        log4j = next(
            e for e in entities
            if e["properties"]["cve_id"] == "CVE-2021-44228"
        )

        self.assertEqual(log4j["properties"]["vendor_project"], "Apache")
        self.assertEqual(log4j["properties"]["product"], "Log4j")

    def test_date_fields(self):
        """Test date field mapping."""
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        for entity in entities:
            props = entity["properties"]

            # date_added should be present
            self.assertIn("date_added", props)
            self.assertIsInstance(props["date_added"], str)

            # due_date may be present
            if "due_date" in props:
                self.assertIsInstance(props["due_date"], str)

    def test_empty_catalog(self):
        """Test handling of empty catalog."""
        import tempfile

        empty_catalog = {
            "catalogVersion": "2025.11.20",
            "dateReleased": "2025-11-20",
            "count": 0,
            "vulnerabilities": []
        }

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(empty_catalog, f)
            temp_path = f.name

        try:
            entities, relationships = map_cisa_kev_to_intelgraph(temp_path)
            self.assertEqual(len(entities), 0)
            self.assertEqual(len(relationships), 0)
        finally:
            os.unlink(temp_path)


class TestUtilityFunctions(unittest.TestCase):
    """Test utility functions."""

    def test_map_vulnerability_to_entity(self):
        """Test individual vulnerability mapping."""
        vuln = {
            "cveID": "CVE-2021-44228",
            "vendorProject": "Apache",
            "product": "Log4j",
            "vulnerabilityName": "Apache Log4j RCE",
            "dateAdded": "2021-12-10",
            "shortDescription": "RCE vulnerability",
            "requiredAction": "Patch immediately",
            "dueDate": "2021-12-24",
            "knownRansomwareCampaignUse": "Known"
        }

        entity = _map_vulnerability_to_entity(vuln, "2025.11.20")

        self.assertEqual(entity["type"], "Vulnerability")
        self.assertEqual(entity["properties"]["cve_id"], "CVE-2021-44228")
        self.assertEqual(entity["properties"]["vendor_project"], "Apache")
        self.assertTrue(entity["properties"]["known_ransomware_use"])


if __name__ == "__main__":
    unittest.main()
