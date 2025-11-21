"""
Unit tests for De-escalation Coaching demo pipeline.

Tests cover:
- Input validation
- Error handling
- Metrics tracking
- Data integrity
- Edge cases

Run with:
    pytest test_load_demo_data.py -v
    python -m unittest test_load_demo_data.py
"""

import unittest
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch

import sys
sys.path.insert(0, str(Path(__file__).parent))
from load_demo_data import (
    DemoConversationLoader,
    AnalysisMode,
    PipelineMetrics,
    ValidationError,
    AnalysisError
)


class TestPipelineMetrics(unittest.TestCase):
    """Test PipelineMetrics dataclass."""

    def test_metrics_initialization(self):
        """Test metrics initialize with correct defaults."""
        metrics = PipelineMetrics()
        self.assertEqual(metrics.conversations_processed, 0)
        self.assertEqual(metrics.conversations_failed, 0)
        self.assertEqual(metrics.api_calls_made, 0)
        self.assertEqual(metrics.total_processing_time_ms, 0.0)

    def test_metrics_to_dict(self):
        """Test metrics conversion to dictionary."""
        metrics = PipelineMetrics(
            conversations_processed=10,
            conversations_failed=2,
            total_processing_time_ms=1000.0,
            avg_toxicity=0.45
        )
        result = metrics.to_dict()
        self.assertEqual(result['conversations_processed'], 10)
        self.assertEqual(result['avg_processing_time_ms'], 100.0)
        self.assertEqual(result['success_rate'], 10 / 12)

    def test_metrics_success_rate_edge_cases(self):
        """Test success rate with edge cases."""
        metrics = PipelineMetrics()
        result = metrics.to_dict()
        self.assertEqual(result['success_rate'], 0)


class TestDemoConversationLoader(unittest.TestCase):
    """Test DemoConversationLoader class."""

    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.data_path = Path(self.temp_dir) / "datasets"
        self.output_path = Path(self.temp_dir) / "output"
        self.data_path.mkdir(parents=True)

        self.convs_file = self.data_path / "demo-conversations.jsonl"
        self.sample_conversations = [
            {
                "id": "conv_001",
                "scenario": "billing_dispute",
                "customer_message": "I was overcharged!",
                "timestamp": "2025-11-20T10:00:00Z",
                "ground_truth": {
                    "escalation_risk": "high",
                    "toxicity": 0.65,
                    "sentiment": "negative",
                    "emotion": "frustrated"
                }
            },
            {
                "id": "conv_002",
                "scenario": "feature_request",
                "customer_message": "Dark mode would be nice.",
                "timestamp": "2025-11-20T10:05:00Z",
                "ground_truth": {
                    "escalation_risk": "none",
                    "toxicity": 0.1,
                    "sentiment": "neutral",
                    "emotion": "hopeful"
                }
            }
        ]

        with open(self.convs_file, 'w') as f:
            for conv in self.sample_conversations:
                f.write(json.dumps(conv) + '\n')

    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)

    def test_initialization_success(self):
        """Test successful loader initialization."""
        loader = DemoConversationLoader(self.data_path, self.output_path)
        self.assertEqual(loader.data_path, self.data_path)
        self.assertTrue(self.output_path.exists())

    def test_initialization_missing_data_path(self):
        """Test initialization fails with missing data path."""
        with self.assertRaises(FileNotFoundError):
            DemoConversationLoader(Path("/nonexistent"), self.output_path)

    def test_validate_conversation_success(self):
        """Test valid conversation passes validation."""
        loader = DemoConversationLoader(self.data_path, self.output_path)
        valid_conv = {
            "id": "conv_001",
            "scenario": "billing",
            "customer_message": "Test",
            "timestamp": "2025-11-20T10:00:00Z"
        }
        is_valid, error = loader.validate_conversation(valid_conv, 1)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_conversation_missing_field(self):
        """Test missing field fails validation."""
        loader = DemoConversationLoader(self.data_path, self.output_path)
        invalid_conv = {"id": "conv_001", "scenario": "billing"}
        is_valid, error = loader.validate_conversation(invalid_conv, 1)
        self.assertFalse(is_valid)
        self.assertIn("Missing required field", error)

    def test_load_conversations_success(self):
        """Test successful loading."""
        loader = DemoConversationLoader(self.data_path, self.output_path)
        convs = loader.load_conversations()
        self.assertEqual(len(convs), 2)
        self.assertEqual(convs[0]['id'], 'conv_001')

    def test_load_conversations_skips_invalid(self):
        """Test invalid lines are skipped."""
        with open(self.convs_file, 'a') as f:
            f.write("invalid json\n")
        loader = DemoConversationLoader(self.data_path, self.output_path)
        convs = loader.load_conversations()
        self.assertEqual(len(convs), 2)

    def test_analyze_conversation_mock(self):
        """Test mock analysis."""
        loader = DemoConversationLoader(self.data_path, self.output_path, mode=AnalysisMode.MOCK)
        conv = self.sample_conversations[0]
        result = loader.analyze_conversation(conv)
        self.assertIn('analysis', result)
        self.assertIn('diagnostic', result['analysis'])
        self.assertIn('rewrite', result['analysis'])

    def test_process_all_success(self):
        """Test full pipeline."""
        loader = DemoConversationLoader(self.data_path, self.output_path)
        summary = loader.process_all()
        self.assertEqual(summary['total_conversations'], 2)
        self.assertIn('risk_distribution', summary)
        self.assertTrue((self.output_path / "analysis_results.json").exists())


class TestEdgeCases(unittest.TestCase):
    """Test edge cases."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.data_path = Path(self.temp_dir) / "datasets"
        self.output_path = Path(self.temp_dir) / "output"
        self.data_path.mkdir(parents=True)
        self.convs_file = self.data_path / "demo-conversations.jsonl"

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_empty_file(self):
        """Test empty file raises error."""
        self.convs_file.touch()
        loader = DemoConversationLoader(self.data_path, self.output_path)
        with self.assertRaises(ValueError):
            loader.load_conversations()

    def test_unicode_handling(self):
        """Test unicode content."""
        conv = {
            "id": "unicode",
            "scenario": "test",
            "customer_message": "Test 😤 中文",
            "timestamp": "2025-11-20T10:00:00Z"
        }
        with open(self.convs_file, 'w', encoding='utf-8') as f:
            f.write(json.dumps(conv, ensure_ascii=False) + '\n')
        loader = DemoConversationLoader(self.data_path, self.output_path)
        convs = loader.load_conversations()
        self.assertIn('😤', convs[0]['customer_message'])


if __name__ == '__main__':
    unittest.main()
