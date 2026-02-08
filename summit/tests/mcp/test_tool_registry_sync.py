import unittest
import os
from unittest.mock import Mock
from summit.mcp.catalog.sync import ToolSync
from summit.mcp.catalog.schema import Tool, Catalog

class TestToolSync(unittest.TestCase):
    def test_sync_determinism(self):
        mock_transport = Mock()
        # Return tools in arbitrary order
        mock_transport.list_tools.return_value = [
            {"name": "tool_b", "description": "B", "inputSchema": {}},
            {"name": "tool_a", "description": "A", "inputSchema": {}}
        ]

        syncer = ToolSync([mock_transport])
        catalog = syncer.sync()

        # Verify sorted order
        self.assertEqual(catalog.tools[0].name, "tool_a")
        self.assertEqual(catalog.tools[1].name, "tool_b")

        # Verify hash stability
        hash1 = catalog.catalog_hash
        self.assertTrue(len(hash1) > 0)

        # Run again
        catalog2 = syncer.sync()
        self.assertEqual(catalog2.catalog_hash, hash1)

        # Generate artifact
        artifact_path = "artifacts/evidence/mcp/tool_catalog.json"
        os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
        syncer.save_catalog(catalog, artifact_path)

if __name__ == '__main__':
    unittest.main()
