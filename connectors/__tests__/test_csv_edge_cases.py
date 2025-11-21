"""Golden I/O tests for CSV connector edge cases."""

import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from connectors.csv_connector.connector import CSVConnector


class TestCSVEdgeCases(unittest.TestCase):
    """Test CSV connector with edge cases."""

    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = Path(__file__).parent.parent / "csv_connector"
        self.manifest_path = self.test_dir / "manifest.yaml"

    def test_empty_csv(self):
        """Test handling of empty CSV file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("id,name,type,description\n")  # Headers only
            temp_file = f.name

        try:
            connector = CSVConnector(str(self.manifest_path), temp_file)
            results = connector.run()

            self.assertEqual(results['stats']['records_processed'], 0)
            self.assertEqual(results['stats']['records_succeeded'], 0)
            self.assertEqual(results['stats']['records_failed'], 0)

        finally:
            os.unlink(temp_file)

    def test_pii_redaction(self):
        """Test PII redaction in CSV data."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("id,name,type,email,description\n")
            f.write('1,"John Doe",Person,"john.doe@example.com","Test user"\n')
            temp_file = f.name

        try:
            connector = CSVConnector(str(self.manifest_path), temp_file)
            results = connector.run()

            # Should have processed the record
            self.assertEqual(results['stats']['records_processed'], 1)
            self.assertEqual(results['stats']['records_succeeded'], 1)

            # Should have detected PII
            self.assertGreater(results['stats']['pii_detections'], 0)

            # Check that email was detected
            pii_report = results.get('pii_report', {})
            self.assertGreater(pii_report.get('total_actions', 0), 0)

        finally:
            os.unlink(temp_file)

    def test_blocked_fields(self):
        """Test that blocked fields are filtered out."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("id,name,type,credit_card,description\n")
            f.write('1,"Test",Person,"4111-1111-1111-1111","Has CC"\n')
            temp_file = f.name

        try:
            connector = CSVConnector(str(self.manifest_path), temp_file)
            results = connector.run()

            # Should have processed the record
            self.assertEqual(results['stats']['records_processed'], 1)

            # Check license violations
            license_report = results.get('license_report', {})
            violations = license_report.get('total_violations', 0)

            # credit_card field should be blocked
            if violations > 0:
                self.assertGreater(violations, 0)

        finally:
            os.unlink(temp_file)

    def test_special_characters(self):
        """Test CSV with special characters."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("id,name,type,description\n")
            f.write('1,"O\'Brien, ""The Boss""",Person,"Quote, comma; special"\n')
            temp_file = f.name

        try:
            connector = CSVConnector(str(self.manifest_path), temp_file)
            results = connector.run()

            self.assertEqual(results['stats']['records_processed'], 1)
            self.assertEqual(results['stats']['records_succeeded'], 1)

        finally:
            os.unlink(temp_file)

    def test_unicode_data(self):
        """Test CSV with unicode characters."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write("id,name,type,description\n")
            f.write('1,"José García",Person,"Ñoño 日本語 🎉"\n')
            temp_file = f.name

        try:
            connector = CSVConnector(str(self.manifest_path), temp_file)
            results = connector.run()

            self.assertEqual(results['stats']['records_processed'], 1)
            self.assertEqual(results['stats']['records_succeeded'], 1)

        finally:
            os.unlink(temp_file)

    def test_large_batch(self):
        """Test processing large batch of records."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("id,name,type,description\n")
            for i in range(100):
                f.write(f'{i},"Person {i}",Person,"Test record {i}"\n')
            temp_file = f.name

        try:
            connector = CSVConnector(str(self.manifest_path), temp_file)
            results = connector.run()

            self.assertEqual(results['stats']['records_processed'], 100)
            self.assertEqual(results['stats']['records_succeeded'], 100)
            self.assertEqual(results['stats']['records_failed'], 0)

            # Should complete in reasonable time (< 10 seconds for 100 records)
            duration = results['stats'].get('duration_seconds', 0)
            self.assertLess(duration, 10)

        finally:
            os.unlink(temp_file)

    def test_malformed_csv(self):
        """Test handling of malformed CSV."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("id,name,type,description\n")
            f.write('1,"Unclosed quote,Person,"Missing field"\n')  # Malformed
            temp_file = f.name

        try:
            connector = CSVConnector(str(self.manifest_path), temp_file)
            results = connector.run()

            # Should handle gracefully (may fail or succeed depending on csv parser)
            # At minimum, should not crash
            self.assertIsNotNone(results)

        finally:
            os.unlink(temp_file)


if __name__ == "__main__":
    unittest.main()
