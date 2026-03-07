import tempfile
import unittest
import zipfile
from pathlib import Path

from connectors.gdelt_gkg.connector import GDELTGKGConnector
from connectors.gdelt_gkg.fetch_raw_index import (
    merge_index_with_md5,
    parse_index_lines,
    parse_md5_lines,
)
from connectors.gdelt_gkg.schema_mapping import (
    derive_observation_id,
    map_gkg_to_intelgraph,
    parse_gkg_line,
)


class TestGDELTGKGConnector(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parent.parent / "gdelt_gkg"
        self.sample_path = root / "sample_gkg_v21.tsv"
        self.manifest_path = root / "manifest.yaml"

    def test_parse_gkg_line(self):
        with open(self.sample_path, encoding="utf-8") as handle:
            record = parse_gkg_line(handle.readline())

        self.assertEqual(record.gkg_record_id, "GKG-20250101000000-0001")
        self.assertEqual(record.source_common_name, "reuters.com")
        self.assertIn("ECON_GROWTH", record.themes)
        self.assertIn("US#New York#US#NYC#40.7#-74.0", record.locations)

    def test_map_gkg_to_intelgraph(self):
        with open(self.sample_path, encoding="utf-8") as handle:
            record = parse_gkg_line(handle.readline())

        entities, relationships = map_gkg_to_intelgraph(record)

        entity_types = {entity["type"] for entity in entities}
        self.assertIn("GDELT_Record", entity_types)
        self.assertIn("Theme", entity_types)
        self.assertIn("Location", entity_types)
        self.assertIn("Observation", entity_types)

        relationship_types = {rel["type"] for rel in relationships}
        self.assertSetEqual(relationship_types, {"MENTIONS", "EVIDENCED_BY", "TARGETS"})

    def test_derive_observation_id_is_deterministic(self):
        first = derive_observation_id("a", "theme", "b")
        second = derive_observation_id("a", "theme", "b")
        other = derive_observation_id("a", "theme", "c")

        self.assertEqual(first, second)
        self.assertNotEqual(first, other)

    def test_index_and_md5_merge(self):
        index_lines = [
            "1234 20250101000000.gkg.csv.zip",
            "4567 20250101001500.gkg.csv.zip",
        ]
        md5_lines = [
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 20250101000000.gkg.csv.zip",
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb 20250101001500.gkg.csv.zip",
        ]

        indexed = parse_index_lines(index_lines)
        checksums = parse_md5_lines(md5_lines)
        merged = merge_index_with_md5(indexed, checksums)

        self.assertEqual(len(merged), 2)
        self.assertEqual(merged[0].md5, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
        self.assertTrue(merged[0].evidence_ref.startswith("gdelt::"))

    def test_connector_reads_zip_payload(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = Path(tmpdir) / "sample.zip"
            with zipfile.ZipFile(zip_path, mode="w") as archive:
                archive.write(self.sample_path, arcname="sample.tsv")

            connector = GDELTGKGConnector(
                manifest_path=str(self.manifest_path), data_path=str(zip_path)
            )
            summary = connector.run()

        self.assertEqual(summary["stats"]["records_processed"], 1)
        self.assertEqual(summary["stats"]["records_failed"], 0)


if __name__ == "__main__":
    unittest.main()
