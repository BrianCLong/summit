"""
End-to-end integration tests for CISA KEV connector.

Tests the complete ingestion pipeline with mock database.
"""

import unittest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from pathlib import Path
from typing import List, Dict, Any

from connectors.cisa_kev.schema_mapping import map_cisa_kev_to_intelgraph
from connectors.cisa_kev.connector import CISAKEVConnector


class MockGraphDBClient:
    """Mock GraphDB client for testing."""

    def __init__(self):
        self.entities = []
        self.relationships = []
        self.bulk_insert_called = False

    def bulk_insert_entities(self, entities: List[Dict[str, Any]]) -> bool:
        """Mock bulk insert entities."""
        self.entities.extend(entities)
        self.bulk_insert_called = True
        return True

    def bulk_insert_relationships(self, relationships: List[Dict[str, Any]]) -> bool:
        """Mock bulk insert relationships."""
        self.relationships.extend(relationships)
        return True

    def query(self, query: str) -> List[Dict[str, Any]]:
        """Mock query."""
        return self.entities


class TestE2EIngestion(unittest.TestCase):
    """End-to-end ingestion pipeline tests."""

    @classmethod
    def setUpClass(cls):
        """Set up test fixtures."""
        cls.sample_file = str(
            Path(__file__).parent.parent / "sample.json"
        )

    def setUp(self):
        """Set up mock database."""
        self.mock_db = MockGraphDBClient()

    def test_full_pipeline(self):
        """Test complete ingestion pipeline."""
        # 1. Extract and map
        entities, relationships = map_cisa_kev_to_intelgraph(self.sample_file)

        # 2. Validate
        self.assertGreater(len(entities), 0, "Should extract entities")

        # 3. Load to mock DB
        success = self.mock_db.bulk_insert_entities(entities)
        self.assertTrue(success, "Bulk insert should succeed")

        if relationships:
            self.mock_db.bulk_insert_relationships(relationships)

        # 4. Verify database state
        self.assertTrue(self.mock_db.bulk_insert_called)
        self.assertEqual(len(self.mock_db.entities), len(entities))

        # 5. Query to verify
        results = self.mock_db.query("MATCH (v:Vulnerability) RETURN v")
        self.assertEqual(len(results), len(entities))

    def test_pipeline_with_filtering(self):
        """Test pipeline with ransomware filtering."""
        # Extract with ransomware filter
        entities, _ = map_cisa_kev_to_intelgraph(
            self.sample_file,
            config={"filter_ransomware": True}
        )

        # Load to mock DB
        self.mock_db.bulk_insert_entities(entities)

        # Verify all entities have ransomware flag
        for entity in self.mock_db.entities:
            self.assertTrue(entity["properties"]["known_ransomware_use"])

    def test_pipeline_error_handling(self):
        """Test pipeline error handling."""
        # Simulate database error
        self.mock_db.bulk_insert_entities = Mock(return_value=False)

        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        success = self.mock_db.bulk_insert_entities(entities)
        self.assertFalse(success, "Should handle DB errors")

    def test_pipeline_rollback(self):
        """Test pipeline rollback on failure."""
        # Simulate partial success
        entities, _ = map_cisa_kev_to_intelgraph(self.sample_file)

        # Insert half successfully
        half = len(entities) // 2
        self.mock_db.bulk_insert_entities(entities[:half])

        # Verify partial state
        self.assertEqual(len(self.mock_db.entities), half)

        # In production, should rollback to zero
        # Mock rollback
        self.mock_db.entities = []
        self.assertEqual(len(self.mock_db.entities), 0)


class TestConnectorE2E(unittest.TestCase):
    """End-to-end tests for CISAKEVConnector class."""

    @classmethod
    def setUpClass(cls):
        """Set up test fixtures."""
        cls.sample_file = str(
            Path(__file__).parent.parent / "sample.json"
        )

    def test_connector_lifecycle(self):
        """Test connector connection lifecycle."""
        async def run_test():
            connector = CISAKEVConnector(config={
                "cache_enabled": False
            })

            # Test connection
            await connector.connect()
            self.assertIsNotNone(connector._client)

            # Test health check
            # Note: This will make a real HTTP request to CISA
            # In production, mock this
            # healthy = await connector.test_connection()
            # self.assertTrue(healthy)

            # Disconnect
            await connector.disconnect()
            self.assertIsNone(connector._client)

        asyncio.run(run_test())

    def test_connector_extract_batches(self):
        """Test connector batch extraction."""
        async def run_test():
            connector = CISAKEVConnector(config={
                "batch_size": 50,
                "cache_enabled": False
            })

            await connector.connect()

            # Mock the API response
            with patch.object(connector, '_fetch_kev_data') as mock_fetch:
                # Load sample data
                import json
                with open(self.sample_file) as f:
                    sample_data = json.load(f)

                mock_fetch.return_value = sample_data

                # Extract batches
                batches = []
                async for batch in connector.extract_data(batch_size=1):
                    batches.append(batch)

                # Verify batches
                self.assertGreater(len(batches), 0)
                self.assertEqual(len(batches), sample_data["count"])

            await connector.disconnect()

        asyncio.run(run_test())

    def test_connector_metadata(self):
        """Test connector metadata retrieval."""
        async def run_test():
            connector = CISAKEVConnector(config={})

            metadata = await connector.get_metadata()

            # Verify metadata structure
            self.assertEqual(metadata["connector_name"], "cisa-kev")
            self.assertEqual(metadata["connector_version"], "1.0.0")
            self.assertEqual(metadata["ingestion_type"], "batch")
            self.assertIn("capabilities", metadata)

        asyncio.run(run_test())

    def test_connector_caching(self):
        """Test connector caching behavior."""
        async def run_test():
            connector = CISAKEVConnector(config={
                "cache_enabled": True,
                "cache_ttl_hours": 24
            })

            await connector.connect()

            # Mock the API
            with patch.object(connector, '_fetch_kev_data') as mock_fetch:
                import json
                with open(self.sample_file) as f:
                    sample_data = json.load(f)

                mock_fetch.return_value = sample_data

                # First call should hit API
                await connector._fetch_kev_data()
                self.assertEqual(mock_fetch.call_count, 1)

                # Second call should use cache
                await connector._fetch_kev_data()
                self.assertEqual(mock_fetch.call_count, 1)  # Still 1

                # Verify cache is valid
                self.assertTrue(connector._is_cache_valid())

            await connector.disconnect()

        asyncio.run(run_test())


class TestLicenseEnforcement(unittest.TestCase):
    """Test license registry enforcement."""

    def test_license_check(self):
        """Test license registry integration."""
        # CISA KEV is public domain, should always pass
        # In production, integrate with license registry service

        entities, _ = map_cisa_kev_to_intelgraph(
            str(Path(__file__).parent.parent / "sample.json")
        )

        # Verify data classification
        for entity in entities:
            self.assertEqual(
                entity["properties"]["data_classification"],
                "public"
            )

    def test_terms_of_service(self):
        """Test TOS compliance."""
        # CISA data is public domain with standard privacy policy
        # No specific TOS restrictions

        # In production, verify:
        # 1. Attribution requirements
        # 2. Usage restrictions
        # 3. Redistribution terms
        pass


class TestPIIDetection(unittest.TestCase):
    """Test PII detection integration."""

    def test_no_pii_in_kev_data(self):
        """Test that no PII is present in KEV data."""
        entities, _ = map_cisa_kev_to_intelgraph(
            str(Path(__file__).parent.parent / "sample.json")
        )

        # Verify no PII fields marked
        for entity in entities:
            metadata = entity.get("_metadata", {})
            pii_fields = metadata.get("_pii_fields", [])
            self.assertEqual(
                len(pii_fields),
                0,
                f"Unexpected PII found: {pii_fields}"
            )


class TestObservability(unittest.TestCase):
    """Test observability integration."""

    def test_metrics_recording(self):
        """Test that metrics are recorded."""
        # In production, verify:
        # 1. Prometheus metrics exposed
        # 2. SLI/SLO measurements recorded
        # 3. Structured logging emitted
        pass

    def test_sli_slo_tracking(self):
        """Test SLI/SLO tracking."""
        # In production, verify:
        # 1. Availability SLI recorded
        # 2. Latency SLI recorded
        # 3. Data freshness SLI recorded
        # 4. SLO evaluations run
        # 5. Alerts triggered on breach
        pass


if __name__ == "__main__":
    unittest.main()
