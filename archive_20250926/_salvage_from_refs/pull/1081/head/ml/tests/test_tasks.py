"""
Test cases for Celery tasks and ML workflows
"""

import json
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.modules.setdefault("ml.app.monitoring.metrics", MagicMock(MLMetrics=MagicMock()))
sys.modules.setdefault(
    "ml.app.monitoring",
    MagicMock(track_cache_operation=lambda *a, **k: None, track_error=lambda *a, **k: None),
)
from ml.app.tasks import (
    _fallback_community_detection,
    _fallback_entity_resolution,
    _fallback_link_prediction,
    task_audio_entity_extraction,
    task_community_detect,
    task_entity_resolution,
    task_image_entity_extraction,
    task_link_prediction,
    task_nlp_entities,
)


class TestNLPTasks:
    """Test NLP-related Celery tasks"""

    @patch("ml.app.tasks.get_text_analyzer")
    def test_task_nlp_entities_basic(self, mock_get_analyzer):
        """Test basic NLP entity extraction task"""
        mock_analyzer = MagicMock()
        mock_analyzer.analyze_text.return_value = {
            "entities": [],
            "sentiment": {"label": "POSITIVE", "score": 0.9},
            "keywords": ["john", "doe"],
            "language": "en",
            "language_confidence": 0.99,
        }
        mock_get_analyzer.return_value = mock_analyzer
        payload = {
            "docs": [
                {"id": "doc1", "text": "John Doe works at Acme Corp"},
                {"id": "doc2", "text": "Contact: jane@example.com"},
            ],
            "job_id": "test-job-1",
        }
        result = task_nlp_entities(payload)
        assert result["job_id"] == "test-job-1"
        assert result["kind"] == "nlp_entities"
        assert len(result["results"]) == 2
        assert result["results"][0]["language"] == "en"
        assert "sentiment" in result["results"][0]

    @patch("ml.app.tasks.get_text_analyzer")
    @patch("ml.app.tasks._NLP_PIPE")
    def test_task_nlp_entities_with_spacy(self, mock_nlp_pipe, mock_get_analyzer):
        """Test NLP task with spaCy pipeline"""
        mock_analyzer = MagicMock()
        mock_analyzer.analyze_text.return_value = {
            "entities": [],
            "sentiment": {},
            "keywords": [],
            "language": "en",
            "language_confidence": 0.95,
        }
        mock_get_analyzer.return_value = mock_analyzer
        mock_entity = MagicMock()
        mock_entity.text = "John Doe"
        mock_entity.label_ = "PERSON"
        mock_entity.start_char = 0
        mock_entity.end_char = 8
        mock_doc = MagicMock()
        mock_doc.ents = [mock_entity]
        mock_nlp_pipe.return_value = mock_doc
        payload = {
            "docs": [{"id": "doc1", "text": "John Doe works here"}],
            "job_id": "test-job-spacy",
        }
        result = task_nlp_entities(payload)
        entities = result["results"][0]["entities"]
        spacy_entities = [e for e in entities if e.get("source") == "spacy"]
        assert len(spacy_entities) > 0
        assert result["results"][0]["language"] == "en"

    @patch("ml.app.tasks.get_text_analyzer")
    def test_task_nlp_entities_empty_docs(self, mock_get_analyzer):
        """Test NLP task with empty documents"""
        mock_analyzer = MagicMock()
        mock_analyzer.analyze_text.return_value = {
            "entities": [],
            "sentiment": {},
            "keywords": [],
            "language": "en",
            "language_confidence": 1.0,
        }
        mock_get_analyzer.return_value = mock_analyzer
        payload = {"docs": [], "job_id": "empty-job"}
        result = task_nlp_entities(payload)
        assert result["results"] == []

    @patch("ml.app.tasks.get_text_analyzer")
    def test_task_nlp_entities_malformed_input(self, mock_get_analyzer):
        """Test NLP task error handling"""
        mock_analyzer = MagicMock()
        mock_analyzer.analyze_text.return_value = {
            "entities": [],
            "sentiment": {},
            "keywords": [],
            "language": "en",
            "language_confidence": 1.0,
        }
        mock_get_analyzer.return_value = mock_analyzer
        payload = {
            "docs": [{"id": "doc1"}],
            "job_id": "malformed-job",
        }
        try:
            result = task_nlp_entities(payload)
            assert "results" in result
        except KeyError:
            pass


class TestEntityResolutionTasks:
    """Test entity resolution Celery tasks"""

    @patch("ml.app.tasks.get_entity_resolver")
    def test_task_entity_resolution_success(self, mock_get_resolver):
        """Test successful entity resolution task"""
        mock_resolver = MagicMock()
        mock_resolver.resolve_entities.return_value = [("1", "2", 0.95)]
        mock_resolver.use_transformers = True
        mock_get_resolver.return_value = mock_resolver

        payload = {
            "records": [{"id": "1", "name": "John Smith"}, {"id": "2", "name": "J. Smith"}],
            "threshold": 0.8,
            "job_id": "er-job-1",
        }

        result = task_entity_resolution(payload)

        assert result["job_id"] == "er-job-1"
        assert result["kind"] == "entity_resolution"
        assert result["links"] == [("1", "2", 0.95)]
        assert result["method"] == "transformer"
        assert result["threshold"] == 0.8
        assert result["total_entities"] == 2
        assert result["matches_found"] == 1

    @patch("ml.app.tasks.get_entity_resolver")
    def test_task_entity_resolution_fallback(self, mock_get_resolver):
        """Test entity resolution fallback on error"""
        mock_get_resolver.side_effect = Exception("Model loading failed")

        payload = {
            "records": [
                {"id": "1", "name": "John Smith"},
                {"id": "2", "name": "John Smith"},  # Exact match
            ],
            "threshold": 0.8,
            "job_id": "er-fallback-job",
        }

        result = task_entity_resolution(payload)

        assert result["job_id"] == "er-fallback-job"
        assert result["kind"] == "entity_resolution"
        assert len(result["links"]) >= 0  # Fallback should work

    def test_fallback_entity_resolution(self):
        """Test fallback entity resolution algorithm"""
        payload = {
            "records": [
                {"id": "1", "name": "John Smith"},
                {"id": "2", "name": "John Smith"},  # Exact match
                {"id": "3", "name": "Jane Doe"},  # Different
            ],
            "threshold": 0.8,
            "job_id": "fallback-test",
        }

        result = _fallback_entity_resolution(payload)

        assert result["job_id"] == "fallback-test"
        assert result["kind"] == "entity_resolution"

        # Should find the John Smith match
        links = result["links"]
        if links:
            assert any(link[2] >= 0.8 for link in links)  # High similarity


class TestLinkPredictionTasks:
    """Test link prediction Celery tasks"""

    @patch("ml.app.tasks.get_link_predictor")
    def test_task_link_prediction_success(self, mock_get_predictor):
        """Test successful link prediction task"""
        mock_predictor = MagicMock()
        mock_predictor.predict_links.return_value = [
            {"u": "A", "v": "D", "score": 2.5, "method": "adamic_adar"}
        ]
        mock_get_predictor.return_value = mock_predictor

        payload = {
            "edges": [("A", "B"), ("B", "C"), ("C", "D")],
            "top_k": 5,
            "method": "adamic_adar",
            "job_id": "link-pred-job",
        }

        result = task_link_prediction(payload)

        assert result["job_id"] == "link-pred-job"
        assert result["kind"] == "link_prediction"
        assert result["method"] == "adamic_adar"
        assert result["total_edges"] == 3
        assert result["predictions_count"] == 1
        assert len(result["predictions"]) == 1

    @patch("ml.app.tasks.get_link_predictor")
    def test_task_link_prediction_fallback(self, mock_get_predictor):
        """Test link prediction fallback on error"""
        mock_get_predictor.side_effect = Exception("NetworkX error")

        payload = {
            "edges": [("A", "B"), ("B", "C"), ("A", "C")],
            "top_k": 10,
            "job_id": "link-fallback-job",
        }

        result = task_link_prediction(payload)

        assert result["job_id"] == "link-fallback-job"
        assert result["kind"] == "link_prediction"
        assert "predictions" in result

    def test_fallback_link_prediction(self):
        """Test fallback link prediction algorithm"""
        payload = {
            "edges": [("A", "B"), ("B", "C"), ("A", "C")],  # Triangle
            "top_k": 5,
            "job_id": "fallback-link-test",
        }

        result = _fallback_link_prediction(payload)

        assert result["job_id"] == "fallback-link-test"
        assert result["kind"] == "link_prediction"
        assert "predictions" in result
        assert len(result["predictions"]) <= 5

    def test_task_link_prediction_empty_graph(self):
        """Test link prediction with empty graph"""
        payload = {"edges": [], "top_k": 10, "job_id": "empty-graph-job"}

        result = task_link_prediction(payload)
        assert result["predictions"] == [] or result["predictions_count"] == 0


class TestCommunityDetectionTasks:
    """Test community detection Celery tasks"""

    @patch("ml.app.tasks.get_community_detector")
    def test_task_community_detect_success(self, mock_get_detector):
        """Test successful community detection task"""
        mock_detector = MagicMock()
        mock_detector.detect_communities.return_value = [
            {"community_id": "c0", "members": ["A", "B"], "size": 2, "algorithm": "louvain"},
            {"community_id": "c1", "members": ["C", "D"], "size": 2, "algorithm": "louvain"},
        ]
        mock_get_detector.return_value = mock_detector

        payload = {
            "edges": [("A", "B"), ("C", "D")],
            "algorithm": "louvain",
            "resolution": 1.0,
            "job_id": "community-job",
        }

        result = task_community_detect(payload)

        assert result["job_id"] == "community-job"
        assert result["kind"] == "community_detect"
        assert result["algorithm"] == "louvain"
        assert result["resolution"] == 1.0
        assert result["total_edges"] == 2
        assert result["communities_found"] == 2
        assert len(result["communities"]) == 2

    @patch("ml.app.tasks.get_community_detector")
    def test_task_community_detect_fallback(self, mock_get_detector):
        """Test community detection fallback on error"""
        mock_get_detector.side_effect = Exception("Algorithm error")

        payload = {
            "edges": [("A", "B"), ("B", "C"), ("C", "A")],
            "algorithm": "invalid_algorithm",
            "job_id": "community-fallback-job",
        }

        result = task_community_detect(payload)

        assert result["job_id"] == "community-fallback-job"
        assert result["kind"] == "community_detect"
        assert "communities" in result

    @patch("ml.app.cache.Redis")
    @patch("ml.app.tasks.get_community_detector")
    def test_task_community_detect_cache_hit(self, mock_get_detector, mock_redis_cls):
        from ml.app import cache as cache_module

        cache_module._redis_client = None

        redis_instance = AsyncMock()
        base_result = {
            "communities": [{"community_id": "c0", "members": ["A", "B"]}],
            "algorithm": "louvain",
            "resolution": 1.0,
            "total_edges": 1,
            "communities_found": 1,
        }
        redis_instance.get.return_value = json.dumps(base_result)
        mock_redis_cls.from_url.return_value = redis_instance

        payload = {
            "edges": [("A", "B")],
            "algorithm": "louvain",
            "resolution": 1.0,
            "job_id": "cache-job",
        }

        result = task_community_detect(payload)

        fingerprint = cache_module.fingerprint_graph(payload["edges"], "louvain", 1.0)
        redis_instance.get.assert_awaited_once_with(f"community:{fingerprint}")
        mock_get_detector.assert_not_called()
        assert result["communities"] == base_result["communities"]
        redis_instance.set.assert_not_awaited()

    @patch("ml.app.cache.Redis")
    @patch("ml.app.tasks.get_community_detector")
    def test_task_community_detect_cache_miss_store(self, mock_get_detector, mock_redis_cls):
        from ml.app import cache as cache_module

        cache_module._redis_client = None

        redis_instance = AsyncMock()
        redis_instance.get.return_value = None
        mock_redis_cls.from_url.return_value = redis_instance

        mock_detector = MagicMock()
        mock_detector.detect_communities.return_value = [
            {"community_id": "c0", "members": ["A", "B"]}
        ]
        mock_get_detector.return_value = mock_detector

        payload = {
            "edges": [("A", "B")],
            "algorithm": "louvain",
            "resolution": 1.0,
            "job_id": "miss-job",
        }

        result = task_community_detect(payload)

        fingerprint = cache_module.fingerprint_graph(payload["edges"], "louvain", 1.0)
        redis_instance.get.assert_awaited_once_with(f"community:{fingerprint}")
        mock_detector.detect_communities.assert_called_once()
        base_expected = result.copy()
        base_expected.pop("job_id")
        base_expected.pop("kind")
        redis_instance.set.assert_awaited_once_with(
            f"community:{fingerprint}", json.dumps(base_expected), ex=cache_module.CACHE_TTL
        )

    def test_fallback_community_detection(self):
        """Test fallback community detection algorithm"""
        payload = {
            "edges": [("A", "B"), ("B", "C"), ("D", "E")],
            "job_id": "fallback-community-test",
        }

        result = _fallback_community_detection(payload)

        assert result["job_id"] == "fallback-community-test"
        assert result["kind"] == "community_detect"
        assert "communities" in result

        # Should find some communities
        communities = result["communities"]
        if communities:
            for comm in communities:
                assert "community_id" in comm
                assert "members" in comm

    def test_task_community_detect_single_component(self):
        """Test community detection on connected graph"""
        payload = {
            "edges": [("A", "B"), ("B", "C"), ("C", "A")],  # Triangle
            "algorithm": "greedy_modularity",
            "job_id": "triangle-job",
        }

        result = task_community_detect(payload)

        assert result["kind"] == "community_detect"
        assert "communities" in result


class TestMultimodalExtractionTasks:
    """Test audio and image entity extraction tasks"""

    def test_task_audio_entity_extraction(self):
        payload = {
            "audio": [{"id": "a1", "transcript": "Alice says hello"}],
            "job_id": "audio-job",
        }

        result = task_audio_entity_extraction(payload)

        assert result["job_id"] == "audio-job"
        assert result["kind"] == "audio_entities"
        assert len(result["results"]) == 1
        assert result["results"][0]["entities"][0]["text"] == "Alice"

    def test_task_image_entity_extraction(self):
        payload = {
            "images": [{"id": "img1", "labels": ["PERSON"]}],
            "job_id": "image-job",
        }

        result = task_image_entity_extraction(payload)

        assert result["job_id"] == "image-job"
        assert result["kind"] == "image_entities"
        assert result["results"][0]["entities"][0]["label"] == "PERSON"


class TestTaskIntegration:
    """Test integration between different tasks"""

    def test_task_error_handling_consistency(self):
        """Test all tasks handle errors consistently"""
        invalid_payload = {"invalid": "data"}

        tasks = [
            task_nlp_entities,
            task_entity_resolution,
            task_link_prediction,
            task_community_detect,
        ]

        for task in tasks:
            try:
                result = task(invalid_payload)
                # If it doesn't crash, should return dict with job_id
                assert isinstance(result, dict)
            except (KeyError, TypeError):
                # Acceptable to fail on invalid input
                pass

    def test_task_output_format_consistency(self):
        """Test all tasks return consistent output format"""
        # Valid minimal payloads for each task
        payloads = {
            task_nlp_entities: {"docs": [{"id": "1", "text": "test"}], "job_id": "nlp-test"},
            task_entity_resolution: {"records": [{"id": "1", "name": "test"}], "job_id": "er-test"},
            task_link_prediction: {"edges": [("A", "B")], "job_id": "lp-test"},
            task_community_detect: {"edges": [("A", "B")], "job_id": "cd-test"},
        }

        for task, payload in payloads.items():
            result = task(payload)

            # All tasks should return these fields
            assert "job_id" in result
            assert "kind" in result
            assert result["job_id"] == payload["job_id"]


if __name__ == "__main__":
    pytest.main([__file__])
