"""
Unit tests for GDELT GKG schema mapping.
"""

import unittest
from connectors.gdelt.schema_mapping import map_gkg_to_cognitive_domain, get_domain, extract_page_title


class TestGDELTMapping(unittest.TestCase):
    def test_get_domain(self):
        self.assertEqual(get_domain("http://example.com/path"), "example.com")
        self.assertEqual(get_domain("https://sub.test.org/v1"), "sub.test.org")
        self.assertEqual(get_domain("invalid-url"), "invalid-url")

    def test_extract_page_title(self):
        extras = "<PAGE_AUTHORS>Jules</PAGE_AUTHORS><PAGE_TITLE>Hello World</PAGE_TITLE>"
        self.assertEqual(extract_page_title(extras), "Hello World")
        self.assertEqual(extract_page_title("No title here"), "")

    def test_map_gkg_to_cognitive_domain(self):
        # Sample record with 27 columns
        record = [""] * 27
        record[0] = "REC001"
        record[1] = "20240101"
        record[4] = "http://news.com/art1"
        record[7] = "THEME1;THEME2"
        record[15] = "5.5,1,2,3"
        record[26] = "<PAGE_TITLE>Article Title</PAGE_TITLE>"

        entities, relationships = map_gkg_to_cognitive_domain(record)

        # Check entities
        entity_types = [e["type"] for e in entities]
        self.assertIn("Channel", entity_types)
        self.assertIn("Narrative", entity_types)
        self.assertIn("LegitimacySignal", entity_types)

        narrative = next(e for e in entities if e["type"] == "Narrative")
        self.assertEqual(narrative["properties"]["title"], "Article Title")
        self.assertEqual(narrative["properties"]["topic"], "THEME1")

        # Check relationships
        rel_types = [r["type"] for r in relationships]
        self.assertIn("AMPLIFIES", rel_types)
        self.assertIn("SUPPORTS", rel_types)


if __name__ == "__main__":
    unittest.main()
