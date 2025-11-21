"""
Golden IO tests for CISA KEV connector.

Golden IO tests validate the complete ingestion pipeline against known-good outputs.
These tests ensure that:
1. Entity mapping is correct and stable
2. No regression in data transformation
3. Output format matches expectations

Golden tests should be updated when intentional changes are made to the schema mapping.
"""

import unittest
import json
from pathlib import Path
from typing import List, Dict, Any
from deepdiff import DeepDiff

from connectors.cisa_kev.schema_mapping import map_cisa_kev_to_intelgraph


class GoldenTestRunner:
    """Helper class for running golden IO tests."""

    def __init__(self, connector_name: str):
        """
        Initialize golden test runner.

        Args:
            connector_name: Name of the connector being tested
        """
        self.connector_name = connector_name
        self.base_path = Path(__file__).parent / "golden"
        self.input_path = self.base_path / "input"
        self.expected_path = self.base_path / "expected"

    def load_input(self, filename: str) -> str:
        """
        Load input fixture.

        Args:
            filename: Input file name

        Returns:
            Full path to input file
        """
        return str(self.input_path / filename)

    def load_expected(self, filename: str) -> List[Dict[str, Any]]:
        """
        Load expected output.

        Args:
            filename: Expected output file name

        Returns:
            Expected entities or relationships
        """
        with open(self.expected_path / filename) as f:
            return json.load(f)

    def compare_entities(
        self,
        actual: List[Dict],
        expected: List[Dict],
        ignore_fields: List[str] = None
    ) -> tuple[bool, str]:
        """
        Compare actual vs expected entities.

        Args:
            actual: Actual entities
            expected: Expected entities
            ignore_fields: Fields to ignore (e.g., timestamps, UUIDs)

        Returns:
            Tuple of (match: bool, diff: str)
        """
        if ignore_fields is None:
            ignore_fields = [
                "root[*]['_metadata']['ingestion_timestamp']",
                "root[*]['_metadata']['ingestion_id']",
            ]

        # Sort for consistent comparison
        actual_sorted = sorted(
            actual,
            key=lambda e: e.get("properties", {}).get("id", "")
        )
        expected_sorted = sorted(
            expected,
            key=lambda e: e.get("properties", {}).get("id", "")
        )

        # Compare counts first
        if len(actual_sorted) != len(expected_sorted):
            return False, f"Count mismatch: expected {len(expected_sorted)}, got {len(actual_sorted)}"

        # Compare each entity
        for i, (actual_entity, expected_entity) in enumerate(zip(actual_sorted, expected_sorted)):
            # Extract only properties and type for comparison
            actual_comparison = {
                "type": actual_entity["type"],
                "properties": {
                    k: v for k, v in actual_entity["properties"].items()
                    if k in expected_entity["properties"]
                }
            }
            expected_comparison = {
                "type": expected_entity["type"],
                "properties": expected_entity["properties"]
            }

            diff = DeepDiff(
                expected_comparison,
                actual_comparison,
                ignore_order=True
            )

            if diff:
                return False, f"Entity {i} mismatch:\n{diff.to_json(indent=2)}"

        return True, ""

    def assert_golden(
        self,
        actual_entities: List[Dict],
        actual_relationships: List[Dict],
        expected_entities_file: str,
        expected_relationships_file: str = None
    ):
        """
        Assert that actual output matches golden fixtures.

        Args:
            actual_entities: Actual entities from mapping
            actual_relationships: Actual relationships from mapping
            expected_entities_file: Expected entities file name
            expected_relationships_file: Expected relationships file name (optional)

        Raises:
            AssertionError: If outputs don't match
        """
        # Load expected entities
        expected_entities = self.load_expected(expected_entities_file)

        # Compare entities
        match, diff = self.compare_entities(actual_entities, expected_entities)
        if not match:
            raise AssertionError(f"Entity mismatch:\n{diff}")

        # Compare relationships if provided
        if expected_relationships_file:
            expected_relationships = self.load_expected(expected_relationships_file)
            match, diff = self.compare_entities(actual_relationships, expected_relationships)
            if not match:
                raise AssertionError(f"Relationship mismatch:\n{diff}")


class TestGoldenIO(unittest.TestCase):
    """Golden IO tests for CISA KEV connector."""

    @classmethod
    def setUpClass(cls):
        """Set up golden test runner."""
        cls.runner = GoldenTestRunner("cisa-kev")

    def test_golden_basic_ingestion(self):
        """
        Golden test: basic ingestion.

        Validates that basic KEV data is correctly mapped to entities.
        """
        # Load input
        input_file = self.runner.load_input("sample_kev.json")

        # Process
        entities, relationships = map_cisa_kev_to_intelgraph(input_file)

        # Assert against golden output
        self.runner.assert_golden(
            entities,
            relationships,
            "entities.json"
        )

    def test_golden_ransomware_filter(self):
        """
        Golden test: ransomware filtering.

        Validates that ransomware filtering works correctly and only
        vulnerabilities with known ransomware use are included.
        """
        # Load input
        input_file = self.runner.load_input("ransomware_sample.json")

        # Process with ransomware filter
        entities, relationships = map_cisa_kev_to_intelgraph(
            input_file,
            config={"filter_ransomware": True}
        )

        # Verify all entities have ransomware flag
        for entity in entities:
            self.assertTrue(
                entity["properties"]["known_ransomware_use"],
                f"Entity {entity['properties']['id']} should have ransomware flag"
            )

        # Assert against golden output
        self.runner.assert_golden(
            entities,
            relationships,
            "ransomware_entities.json"
        )

    def test_golden_entity_structure(self):
        """
        Golden test: entity structure validation.

        Validates that all entities have the required structure and fields.
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        required_top_level = ["type", "properties", "_metadata"]
        required_properties = [
            "id", "cve_id", "name", "vendor_project", "product",
            "source", "confidence"
        ]
        required_metadata = [
            "connector_name", "connector_version", "ingestion_timestamp"
        ]

        for entity in entities:
            # Check top-level structure
            for field in required_top_level:
                self.assertIn(
                    field,
                    entity,
                    f"Entity missing required field: {field}"
                )

            # Check properties
            for field in required_properties:
                self.assertIn(
                    field,
                    entity["properties"],
                    f"Entity properties missing required field: {field}"
                )

            # Check metadata
            for field in required_metadata:
                self.assertIn(
                    field,
                    entity["_metadata"],
                    f"Entity metadata missing required field: {field}"
                )

    def test_golden_data_types(self):
        """
        Golden test: data type validation.

        Validates that all fields have the correct data types.
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        for entity in entities:
            props = entity["properties"]

            # String fields
            self.assertIsInstance(props["id"], str)
            self.assertIsInstance(props["cve_id"], str)
            self.assertIsInstance(props["name"], str)
            self.assertIsInstance(props["source"], str)

            # Float fields
            self.assertIsInstance(props["confidence"], (int, float))
            self.assertGreaterEqual(props["confidence"], 0.0)
            self.assertLessEqual(props["confidence"], 1.0)

            # Boolean fields
            self.assertIsInstance(props["known_ransomware_use"], bool)

            # Date fields (strings in ISO format)
            self.assertIsInstance(props["date_added"], str)

    def test_golden_no_pii(self):
        """
        Golden test: PII detection.

        Validates that no PII is detected in KEV data.
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        for entity in entities:
            metadata = entity.get("_metadata", {})
            pii_fields = metadata.get("_pii_fields", [])

            self.assertEqual(
                len(pii_fields),
                0,
                f"Unexpected PII detected in entity {entity['properties']['id']}: {pii_fields}"
            )

    def test_golden_confidence_scores(self):
        """
        Golden test: confidence scores.

        Validates that all vulnerabilities from CISA KEV have confidence of 1.0
        (authoritative source).
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        for entity in entities:
            confidence = entity["properties"]["confidence"]
            self.assertEqual(
                confidence,
                1.0,
                f"Entity {entity['properties']['id']} should have confidence 1.0 (authoritative source)"
            )

    def test_golden_source_attribution(self):
        """
        Golden test: source attribution.

        Validates that all entities are correctly attributed to cisa-kev.
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        for entity in entities:
            source = entity["properties"]["source"]
            self.assertEqual(
                source,
                "cisa-kev",
                f"Entity {entity['properties']['id']} has incorrect source: {source}"
            )

    def test_golden_idempotency(self):
        """
        Golden test: idempotency.

        Validates that running the mapping multiple times produces identical results.
        """
        input_file = self.runner.load_input("sample_kev.json")

        # Run mapping twice
        entities1, _ = map_cisa_kev_to_intelgraph(input_file)
        entities2, _ = map_cisa_kev_to_intelgraph(input_file)

        # Compare (ignoring timestamps)
        match, diff = self.runner.compare_entities(entities1, entities2)
        self.assertTrue(
            match,
            f"Mapping should be idempotent. Differences found:\n{diff}"
        )

    def test_golden_entity_uniqueness(self):
        """
        Golden test: entity uniqueness.

        Validates that all entity IDs are unique.
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        ids = [e["properties"]["id"] for e in entities]
        unique_ids = set(ids)

        self.assertEqual(
            len(ids),
            len(unique_ids),
            f"Duplicate entity IDs found: {[id for id in ids if ids.count(id) > 1]}"
        )


class TestGoldenRegression(unittest.TestCase):
    """Regression tests using golden outputs."""

    @classmethod
    def setUpClass(cls):
        """Set up golden test runner."""
        cls.runner = GoldenTestRunner("cisa-kev")

    def test_regression_log4j_vulnerability(self):
        """
        Regression test: Log4j vulnerability mapping.

        Ensures the critical Log4j vulnerability (CVE-2021-44228) is
        correctly mapped with all expected fields.
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        # Find Log4j vulnerability
        log4j = next(
            (e for e in entities if e["properties"]["cve_id"] == "CVE-2021-44228"),
            None
        )

        self.assertIsNotNone(log4j, "Log4j vulnerability should be present")

        # Validate specific fields
        self.assertEqual(log4j["properties"]["vendor_project"], "Apache")
        self.assertEqual(log4j["properties"]["product"], "Log4j")
        self.assertTrue(log4j["properties"]["known_ransomware_use"])
        self.assertEqual(log4j["properties"]["date_added"], "2021-12-10")
        self.assertEqual(log4j["properties"]["due_date"], "2021-12-24")

    def test_regression_field_mapping_completeness(self):
        """
        Regression test: field mapping completeness.

        Ensures all KEV fields are mapped to entity properties.
        """
        input_file = self.runner.load_input("sample_kev.json")
        entities, _ = map_cisa_kev_to_intelgraph(input_file)

        entity = entities[0]
        props = entity["properties"]

        # All KEV fields should be mapped
        mapped_kev_fields = [
            "cve_id",           # cveID
            "vendor_project",   # vendorProject
            "product",          # product
            "vulnerability_name",  # vulnerabilityName
            "date_added",       # dateAdded
            "short_description",  # shortDescription
            "required_action",  # requiredAction
            "due_date",         # dueDate
            "known_ransomware_use",  # knownRansomwareCampaignUse
        ]

        for field in mapped_kev_fields:
            self.assertIn(
                field,
                props,
                f"KEV field not mapped: {field}"
            )


if __name__ == "__main__":
    unittest.main()
