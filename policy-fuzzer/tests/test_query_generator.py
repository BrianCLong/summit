import unittest
from unittest.mock import MagicMock, patch
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from query_generator import generate_query

class TestQueryGenerator(unittest.TestCase):

    @patch('query_generator.random')
    def test_generate_query_with_no_grammars(self, mock_random):
        """Tests that a basic query is generated when no grammars are enabled."""
        mock_random.choice.side_effect = ["user_data", "US", "license_A", "30d", "admin", "secure"]
        args = MagicMock()
        args.enable_synonym_dodges = False
        args.enable_field_aliasing = False
        args.enable_regex_dodges = False
        args.enable_time_window_hops = False
        args.enable_data_type_mismatches = False

        query = generate_query(args)

        self.assertEqual(query["data"], "user_data")
        self.assertEqual(query["location"], "US")
        self.assertEqual(query["license"], "license_A")
        self.assertEqual(query["retention"], "30d")
        self.assertEqual(query["user_role"], "admin")
        self.assertEqual(query["network_condition"], "secure")

    @patch('query_generator.random')
    def test_synonym_dodge(self, mock_random):
        """Tests that the synonym dodge grammar is applied correctly."""
        args = MagicMock()
        args.enable_synonym_dodges = True
        args.enable_field_aliasing = False
        args.enable_regex_dodges = False
        args.enable_time_window_hops = False
        args.enable_data_type_mismatches = False

        mock_random.choice.side_effect = ["user_data", "US", "license_A", "30d", "admin", "secure", "user-information", "licence_A"]
        mock_random.random.return_value = 0.4  # Force grammar to be applied

        query = generate_query(args)
        self.assertEqual(query["data"], "user-information")

    @patch('query_generator.random')
    def test_field_aliasing(self, mock_random):
        """Tests that the field aliasing grammar is applied correctly."""
        args = MagicMock()
        args.enable_synonym_dodges = False
        args.enable_field_aliasing = True
        args.enable_regex_dodges = False
        args.enable_time_window_hops = False
        args.enable_data_type_mismatches = False

        mock_random.choice.side_effect = ["user_data", "US", "license_A", "30d", "admin", "secure", "location", "region"]
        mock_random.random.return_value = 0.4

        query = generate_query(args)
        self.assertNotIn("location", query)
        self.assertIn("region", query)
        self.assertEqual(query["region"], "US")

    @patch('query_generator.random')
    def test_regex_dodge(self, mock_random):
        """Tests that the regex dodge grammar is applied correctly."""
        args = MagicMock()
        args.enable_synonym_dodges = False
        args.enable_field_aliasing = False
        args.enable_regex_dodges = True
        args.enable_time_window_hops = False
        args.enable_data_type_mismatches = False

        mock_random.choice.side_effect = ["user_data", "US", "license_A", "30d", "admin", "secure", "[0-9]+m"]
        mock_random.random.return_value = 0.4

        query = generate_query(args)
        self.assertEqual(query["retention"], "[0-9]+m")

    @patch('query_generator.random')
    def test_time_window_hops(self, mock_random):
        """Tests that the time window hop grammar is applied correctly."""
        args = MagicMock()
        args.enable_synonym_dodges = False
        args.enable_field_aliasing = False
        args.enable_regex_dodges = False
        args.enable_time_window_hops = True
        args.enable_data_type_mismatches = False

        hop = {"offset": 0, "unit": "day", "timezone_shift": "-05:00"}
        mock_random.choice.side_effect = ["user_data", "US", "license_A", "30d", "admin", "secure", hop]
        mock_random.random.return_value = 0.4

        query = generate_query(args)
        self.assertIn("timezone_shift", query)
        self.assertEqual(query["timezone_shift"], "-05:00")

    @patch('query_generator.random')
    def test_data_type_mismatches_not_triggered_for_retention(self, mock_random):
        """Tests that data type mismatch is NOT applied for 'retention' due to key mismatch."""
        args = MagicMock()
        args.enable_synonym_dodges = False
        args.enable_field_aliasing = False
        args.enable_regex_dodges = False
        args.enable_time_window_hops = False
        args.enable_data_type_mismatches = True

        mock_random.choice.side_effect = ["user_data", "US", "license_A", "30d", "admin", "secure", "retention_period", "one_month"]
        mock_random.random.return_value = 0.4

        query = generate_query(args)
        self.assertEqual(query["retention"], "30d")

    @patch('query_generator.random')
    def test_data_type_mismatches_triggered_for_access_date(self, mock_random):
        """Tests that data type mismatch is applied correctly for 'access_date'."""
        args = MagicMock()
        args.enable_synonym_dodges = False
        args.enable_field_aliasing = False
        args.enable_regex_dodges = False
        args.enable_time_window_hops = False
        args.enable_data_type_mismatches = True

        mock_random.choice.side_effect = ["user_data", "US", "license_A", "30d", "admin", "secure", "access_date", "yesterday"]
        mock_random.random.return_value = 0.4

        query = generate_query(args)
        self.assertEqual(query["access_date"], "yesterday")

if __name__ == "__main__":
    unittest.main()
