"""
Integration tests for GDELT GKG connector.
"""

import unittest
import asyncio
from connectors.gdelt.connector import GDELTGKGConnector


class TestGDELTConnector(unittest.TestCase):
    def setUp(self):
        self.connector = GDELTGKGConnector()

    async def async_test_connection(self):
        result = await self.connector.test_connection()
        self.assertTrue(result)
        await self.connector.disconnect()

    def test_connection(self):
        asyncio.run(self.async_test_connection())

    async def async_test_extract_data(self):
        await self.connector.connect()
        records = []
        async for record in self.connector.extract_data():
            records.append(record)
            if len(records) >= 5:
                break
        self.assertGreaterEqual(len(records), 1)
        self.assertIn("raw_row", records[0])
        await self.connector.disconnect()

    def test_extract_data(self):
        asyncio.run(self.async_test_extract_data())


if __name__ == "__main__":
    unittest.main()
