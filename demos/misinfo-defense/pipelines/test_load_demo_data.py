"""
Unit tests for Adversarial Misinfo Defense demo pipeline.

Tests cover:
- Input validation
- Error handling
- Retry logic
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
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Import the module to test
import sys
sys.path.insert(0, str(Path(__file__).parent))
from load_demo_data import (
    DemoDataLoader,
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

        self.assertEqual(metrics.posts_processed, 0)
        self.assertEqual(metrics.posts_failed, 0)
        self.assertEqual(metrics.misinfo_detected, 0)
        self.assertEqual(metrics.legitimate_detected, 0)
        self.assertEqual(metrics.total_processing_time_ms, 0.0)
        self.assertEqual(metrics.avg_confidence, 0.0)
        self.assertEqual(len(metrics.errors), 0)

    def test_metrics_to_dict(self):
        """Test metrics conversion to dictionary."""
        metrics = PipelineMetrics(
            posts_processed=10,
            posts_failed=2,
            misinfo_detected=6,
            legitimate_detected=4,
            total_processing_time_ms=1000.0,
            avg_confidence=0.85
        )

        result = metrics.to_dict()

        self.assertEqual(result['posts_processed'], 10)
        self.assertEqual(result['posts_failed'], 2)
        self.assertEqual(result['avg_processing_time_ms'], 100.0)  # 1000/10
        self.assertEqual(result['success_rate'], 10 / 12)  # 10/(10+2)
        self.assertEqual(result['error_count'], 0)

    def test_metrics_success_rate_edge_cases(self):
        """Test success rate calculation handles edge cases."""
        # Zero posts
        metrics = PipelineMetrics()
        result = metrics.to_dict()
        self.assertEqual(result['success_rate'], 0)

        # Only failures
        metrics = PipelineMetrics(posts_failed=5)
        result = metrics.to_dict()
        self.assertEqual(result['success_rate'], 0)


class TestDemoDataLoader(unittest.TestCase):
    """Test DemoDataLoader class."""

    def setUp(self):
        """Set up test fixtures."""
        # Create temporary directories
        self.temp_dir = tempfile.mkdtemp()
        self.data_path = Path(self.temp_dir) / "datasets"
        self.output_path = Path(self.temp_dir) / "output"
        self.data_path.mkdir(parents=True)

        # Create sample data file
        self.posts_file = self.data_path / "demo-posts.jsonl"
        self.sample_posts = [
            {
                "id": "test_001",
                "platform": "twitter",
                "text": "Test post 1",
                "timestamp": "2025-11-20T10:00:00Z",
                "ground_truth": {
                    "is_misinfo": True,
                    "confidence": 0.9,
                    "category": "test_category",
                    "red_flags": ["flag1", "flag2"]
                }
            },
            {
                "id": "test_002",
                "platform": "facebook",
                "text": "Test post 2",
                "timestamp": "2025-11-20T10:05:00Z",
                "ground_truth": {
                    "is_misinfo": False,
                    "confidence": 0.95,
                    "category": "legitimate"
                }
            }
        ]

        with open(self.posts_file, 'w') as f:
            for post in self.sample_posts:
                f.write(json.dumps(post) + '\n')

    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)

    def test_initialization_success(self):
        """Test successful loader initialization."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        self.assertEqual(loader.data_path, self.data_path)
        self.assertEqual(loader.output_path, self.output_path)
        self.assertIsInstance(loader.metrics, PipelineMetrics)
        self.assertTrue(self.output_path.exists())

    def test_initialization_missing_data_path(self):
        """Test initialization fails with missing data path."""
        nonexistent_path = Path("/nonexistent/path")

        with self.assertRaises(FileNotFoundError):
            DemoDataLoader(nonexistent_path, self.output_path)

    def test_mode_auto_detection(self):
        """Test analysis mode is auto-detected."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        # Should be MOCK mode since production modules aren't available
        self.assertEqual(loader.mode, AnalysisMode.MOCK)

    def test_validate_post_success(self):
        """Test post validation with valid data."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        valid_post = {
            "id": "test_001",
            "platform": "twitter",
            "text": "Test content",
            "timestamp": "2025-11-20T10:00:00Z"
        }

        is_valid, error = loader.validate_post(valid_post, 1)

        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_post_missing_field(self):
        """Test post validation fails with missing required field."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        invalid_post = {
            "id": "test_001",
            "platform": "twitter"
            # Missing 'text' and 'timestamp'
        }

        is_valid, error = loader.validate_post(invalid_post, 1)

        self.assertFalse(is_valid)
        self.assertIn("Missing required field", error)

    def test_validate_post_invalid_type(self):
        """Test post validation fails with invalid field type."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        invalid_post = {
            "id": 123,  # Should be string
            "platform": "twitter",
            "text": "Test",
            "timestamp": "2025-11-20T10:00:00Z"
        }

        is_valid, error = loader.validate_post(invalid_post, 1)

        self.assertFalse(is_valid)
        self.assertIn("must be non-empty string", error)

    def test_validate_post_with_media(self):
        """Test post validation with media attachments."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        post_with_media = {
            "id": "test_001",
            "platform": "twitter",
            "text": "Test",
            "timestamp": "2025-11-20T10:00:00Z",
            "media": [
                {"type": "image", "url": "http://example.com/img.jpg"},
                {"type": "video", "url": "http://example.com/vid.mp4"}
            ]
        }

        is_valid, error = loader.validate_post(post_with_media, 1)

        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_post_invalid_media(self):
        """Test post validation fails with invalid media."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        post_invalid_media = {
            "id": "test_001",
            "platform": "twitter",
            "text": "Test",
            "timestamp": "2025-11-20T10:00:00Z",
            "media": [
                {"url": "http://example.com/img.jpg"}  # Missing 'type'
            ]
        }

        is_valid, error = loader.validate_post(post_invalid_media, 1)

        self.assertFalse(is_valid)
        self.assertIn("missing 'type'", error)

    def test_load_posts_success(self):
        """Test successful posts loading."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        posts = loader.load_posts()

        self.assertEqual(len(posts), 2)
        self.assertEqual(posts[0]['id'], 'test_001')
        self.assertEqual(posts[1]['id'], 'test_002')

    def test_load_posts_skip_invalid_lines(self):
        """Test posts loading skips invalid lines."""
        # Add invalid JSON line
        with open(self.posts_file, 'a') as f:
            f.write("invalid json line\n")
            f.write('{"id": "test_003", "platform": "reddit", "text": "Valid", "timestamp": "2025-11-20T10:10:00Z"}\n')

        loader = DemoDataLoader(self.data_path, self.output_path)
        posts = loader.load_posts()

        # Should load 3 valid posts (2 original + 1 after invalid)
        self.assertEqual(len(posts), 3)

    def test_load_posts_missing_file(self):
        """Test posts loading fails with missing file."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        # Remove posts file
        self.posts_file.unlink()

        with self.assertRaises(FileNotFoundError):
            loader.load_posts()

    def test_analyze_post_mock_mode(self):
        """Test post analysis in mock mode."""
        loader = DemoDataLoader(self.data_path, self.output_path, mode=AnalysisMode.MOCK)

        post = self.sample_posts[0]
        result = loader.analyze_post(post)

        self.assertIn('analysis', result)
        self.assertEqual(result['analysis']['mode'], 'mock')
        self.assertTrue(result['analysis']['is_misinfo'])
        self.assertEqual(result['analysis']['confidence'], 0.9)
        self.assertGreater(len(result['analysis']['evidence']), 0)

    def test_analyze_post_generates_evidence(self):
        """Test post analysis generates evidence correctly."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        post = self.sample_posts[0]
        result = loader.analyze_post(post)

        evidence = result['analysis']['evidence']
        self.assertGreater(len(evidence), 0)

        # Check evidence structure
        for item in evidence:
            self.assertIn('type', item)
            self.assertIn('title', item)
            self.assertIn('description', item)
            self.assertIn('severity', item)

    def test_analyze_post_with_retry_success(self):
        """Test retry logic succeeds after transient failure."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        # Mock analyze_post to fail once, then succeed
        call_count = [0]

        original_analyze = loader.analyze_post

        def mock_analyze(post):
            call_count[0] += 1
            if call_count[0] == 1:
                raise Exception("Transient failure")
            return original_analyze(post)

        loader.analyze_post = mock_analyze

        post = self.sample_posts[0]
        result = loader.analyze_post_with_retry(post)

        # Should succeed after retry
        self.assertIn('analysis', result)
        self.assertEqual(call_count[0], 2)  # Called twice

    def test_analyze_post_with_retry_max_exceeded(self):
        """Test retry logic fails after max attempts."""
        loader = DemoDataLoader(self.data_path, self.output_path, max_retries=2)

        # Mock analyze_post to always fail
        def mock_analyze(post):
            raise Exception("Permanent failure")

        loader.analyze_post = mock_analyze

        post = self.sample_posts[0]

        with self.assertRaises(AnalysisError):
            loader.analyze_post_with_retry(post)

    def test_process_all_success(self):
        """Test full pipeline processing."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        summary = loader.process_all()

        # Check summary structure
        self.assertEqual(summary['total_posts'], 2)
        self.assertEqual(summary['misinfo_detected'], 1)
        self.assertEqual(summary['legitimate_content'], 1)
        self.assertEqual(len(summary['results']), 2)

        # Check metrics
        metrics = summary['metrics']
        self.assertEqual(metrics['posts_processed'], 2)
        self.assertEqual(metrics['posts_failed'], 0)
        self.assertEqual(metrics['success_rate'], 1.0)

        # Check output file exists
        output_file = self.output_path / "analysis_results.json"
        self.assertTrue(output_file.exists())

        # Verify output file contents
        with open(output_file) as f:
            saved_data = json.load(f)
            self.assertEqual(saved_data['total_posts'], 2)

    def test_process_all_atomic_write(self):
        """Test results are written atomically."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        # Process normally
        loader.process_all()

        output_file = self.output_path / "analysis_results.json"
        temp_file = self.output_path / "analysis_results.json.tmp"

        # Temp file should not exist (renamed to output_file)
        self.assertTrue(output_file.exists())
        self.assertFalse(temp_file.exists())

    def test_metrics_tracking(self):
        """Test metrics are tracked correctly throughout pipeline."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        loader.process_all()

        metrics = loader.metrics

        self.assertEqual(metrics.posts_processed, 2)
        self.assertEqual(metrics.misinfo_detected, 1)
        self.assertEqual(metrics.legitimate_detected, 1)
        self.assertGreater(metrics.total_processing_time_ms, 0)
        self.assertGreater(metrics.avg_confidence, 0)

    def test_evidence_severity_classification(self):
        """Test evidence severity is classified correctly."""
        loader = DemoDataLoader(self.data_path, self.output_path)

        # Create post with many red flags
        post_high_severity = {
            "id": "test_critical",
            "platform": "twitter",
            "text": "Test",
            "timestamp": "2025-11-20T10:00:00Z",
            "ground_truth": {
                "is_misinfo": True,
                "confidence": 0.95,
                "red_flags": ["flag1", "flag2", "flag3", "flag4"]
            }
        }

        result = loader.analyze_post(post_high_severity)
        evidence = result['analysis']['evidence']

        # Should have critical severity with 4+ red flags
        text_evidence = [e for e in evidence if e['type'] == 'text_analysis']
        self.assertEqual(len(text_evidence), 1)
        self.assertEqual(text_evidence[0]['severity'], 'critical')


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and boundary conditions."""

    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.data_path = Path(self.temp_dir) / "datasets"
        self.output_path = Path(self.temp_dir) / "output"
        self.data_path.mkdir(parents=True)
        self.posts_file = self.data_path / "demo-posts.jsonl"

    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)

    def test_empty_posts_file(self):
        """Test handling of empty posts file."""
        # Create empty file
        self.posts_file.touch()

        loader = DemoDataLoader(self.data_path, self.output_path)

        with self.assertRaises(ValueError):
            loader.load_posts()

    def test_posts_with_empty_lines(self):
        """Test posts file with empty lines."""
        with open(self.posts_file, 'w') as f:
            f.write('{"id": "test_001", "platform": "twitter", "text": "Test", "timestamp": "2025-11-20T10:00:00Z"}\n')
            f.write('\n')  # Empty line
            f.write('  \n')  # Whitespace line
            f.write('{"id": "test_002", "platform": "facebook", "text": "Test2", "timestamp": "2025-11-20T10:05:00Z"}\n')

        loader = DemoDataLoader(self.data_path, self.output_path)
        posts = loader.load_posts()

        self.assertEqual(len(posts), 2)

    def test_unicode_handling(self):
        """Test proper Unicode handling in posts."""
        unicode_post = {
            "id": "unicode_test",
            "platform": "twitter",
            "text": "Test with emoji 🚀 and Chinese 中文",
            "timestamp": "2025-11-20T10:00:00Z"
        }

        with open(self.posts_file, 'w', encoding='utf-8') as f:
            f.write(json.dumps(unicode_post, ensure_ascii=False) + '\n')

        loader = DemoDataLoader(self.data_path, self.output_path)
        posts = loader.load_posts()

        self.assertEqual(len(posts), 1)
        self.assertIn('🚀', posts[0]['text'])
        self.assertIn('中文', posts[0]['text'])


if __name__ == '__main__':
    unittest.main()
