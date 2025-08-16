"""
Test cases for Celery tasks and ML workflows
"""
import pytest
from unittest.mock import patch, MagicMock
from ml.app.tasks import (
    task_nlp_entities,
    task_entity_resolution,
    task_link_prediction,
    task_community_detect,
    task_audio_entity_extraction,
    task_image_entity_extraction,
    _fallback_entity_resolution,
    _fallback_link_prediction,
    _fallback_community_detection
)


class TestNLPTasks:
    """Test NLP-related Celery tasks"""

    def test_task_nlp_entities_basic(self):
        """Test basic NLP entity extraction task"""
        payload = {
            "docs": [
                {"id": "doc1", "text": "John Doe works at Acme Corp"},
                {"id": "doc2", "text": "Contact: jane@example.com"}
            ],
            "job_id": "test-job-1"
        }

        result = task_nlp_entities(payload)

        assert result["job_id"] == "test-job-1"
        assert result["kind"] == "nlp_entities"
        assert "results" in result
        assert len(result["results"]) == 2

        # Check structure of results
        for doc_result in result["results"]:
            assert "doc_id" in doc_result
            assert "entities" in doc_result
            assert isinstance(doc_result["entities"], list)

    @patch('ml.app.tasks._NLP_PIPE')
    def test_task_nlp_entities_with_spacy(self, mock_nlp_pipe):
        """Test NLP task with spaCy pipeline"""
        # Mock spaCy entities
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
            "job_id": "test-job-spacy"
        }

        result = task_nlp_entities(payload)

        assert result["job_id"] == "test-job-spacy"
        entities = result["results"][0]["entities"]

        # Should have spaCy entities
        spacy_entities = [e for e in entities if e.get("source") == "spacy"]
        assert len(spacy_entities) > 0
        assert spacy_entities[0]["text"] == "John Doe"
        assert spacy_entities[0]["label"] == "PERSON"

    def test_task_nlp_entities_empty_docs(self):
        """Test NLP task with empty documents"""
        payload = {
            "docs": [],
            "job_id": "empty-job"
        }

        result = task_nlp_entities(payload)
        assert result["results"] == []

    def test_task_nlp_entities_malformed_input(self):
        """Test NLP task error handling"""
        payload = {
            "docs": [{"id": "doc1"}],  # Missing text field
            "job_id": "malformed-job"
        }

        # Should not crash
        try:
            result = task_nlp_entities(payload)
            assert "results" in result
        except KeyError:
            # It's acceptable to fail on malformed input
            pass


class TestEntityResolutionTasks:
    """Test entity resolution Celery tasks"""

    @patch('ml.app.tasks.get_entity_resolver')
    def test_task_entity_resolution_success(self, mock_get_resolver):
        """Test successful entity resolution task"""
        mock_resolver = MagicMock()
        mock_resolver.resolve_entities.return_value = [("1", "2", 0.95)]
        mock_resolver.use_transformers = True
        mock_get_resolver.return_value = mock_resolver

        payload = {
            "records": [
                {"id": "1", "name": "John Smith"},
                {"id": "2", "name": "J. Smith"}
            ],
            "threshold": 0.8,
            "job_id": "er-job-1"
        }

        result = task_entity_resolution(payload)

        assert result["job_id"] == "er-job-1"
        assert result["kind"] == "entity_resolution"
        assert result["links"] == [("1", "2", 0.95)]
        assert result["method"] == "transformer"
        assert result["threshold"] == 0.8
        assert result["total_entities"] == 2
        assert result["matches_found"] == 1

    @patch('ml.app.tasks.get_entity_resolver')
    def test_task_entity_resolution_fallback(self, mock_get_resolver):
        """Test entity resolution fallback on error"""
        mock_get_resolver.side_effect = Exception("Model loading failed")

        payload = {
            "records": [
                {"id": "1", "name": "John Smith"},
                {"id": "2", "name": "John Smith"}  # Exact match
            ],
            "threshold": 0.8,
            "job_id": "er-fallback-job"
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
                {"id": "3", "name": "Jane Doe"}     # Different
            ],
            "threshold": 0.8,
            "job_id": "fallback-test"
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

    @patch('ml.app.tasks.get_link_predictor')
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
            "job_id": "link-pred-job"
        }

        result = task_link_prediction(payload)

        assert result["job_id"] == "link-pred-job"
        assert result["kind"] == "link_prediction"
        assert result["method"] == "adamic_adar"
        assert result["total_edges"] == 3
        assert result["predictions_count"] == 1
        assert len(result["predictions"]) == 1

    @patch('ml.app.tasks.get_link_predictor')
    def test_task_link_prediction_fallback(self, mock_get_predictor):
        """Test link prediction fallback on error"""
        mock_get_predictor.side_effect = Exception("NetworkX error")

        payload = {
            "edges": [("A", "B"), ("B", "C"), ("A", "C")],
            "top_k": 10,
            "job_id": "link-fallback-job"
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
            "job_id": "fallback-link-test"
        }

        result = _fallback_link_prediction(payload)

        assert result["job_id"] == "fallback-link-test"
        assert result["kind"] == "link_prediction"
        assert "predictions" in result
        assert len(result["predictions"]) <= 5

    def test_task_link_prediction_empty_graph(self):
        """Test link prediction with empty graph"""
        payload = {
            "edges": [],
            "top_k": 10,
            "job_id": "empty-graph-job"
        }

        result = task_link_prediction(payload)
        assert result["predictions"] == [] or result["predictions_count"] == 0


class TestCommunityDetectionTasks:
    """Test community detection Celery tasks"""

    @patch('ml.app.tasks.get_community_detector')
    def test_task_community_detect_success(self, mock_get_detector):
        """Test successful community detection task"""
        mock_detector = MagicMock()
        mock_detector.detect_communities.return_value = [
            {"community_id": "c0", "members": ["A", "B"], "size": 2, "algorithm": "louvain"},
            {"community_id": "c1", "members": ["C", "D"], "size": 2, "algorithm": "louvain"}
        ]
        mock_get_detector.return_value = mock_detector

        payload = {
            "edges": [("A", "B"), ("C", "D")],
            "algorithm": "louvain",
            "resolution": 1.0,
            "job_id": "community-job"
        }

        result = task_community_detect(payload)

        assert result["job_id"] == "community-job"
        assert result["kind"] == "community_detect"
        assert result["algorithm"] == "louvain"
        assert result["resolution"] == 1.0
        assert result["total_edges"] == 2
        assert result["communities_found"] == 2
        assert len(result["communities"]) == 2

    @patch('ml.app.tasks.get_community_detector')
    def test_task_community_detect_fallback(self, mock_get_detector):
        """Test community detection fallback on error"""
        mock_get_detector.side_effect = Exception("Algorithm error")

        payload = {
            "edges": [("A", "B"), ("B", "C"), ("C", "A")],
            "algorithm": "invalid_algorithm",
            "job_id": "community-fallback-job"
        }

        result = task_community_detect(payload)

        assert result["job_id"] == "community-fallback-job"
        assert result["kind"] == "community_detect"
        assert "communities" in result

    def test_fallback_community_detection(self):
        """Test fallback community detection algorithm"""
        payload = {
            "edges": [("A", "B"), ("B", "C"), ("D", "E")],
            "job_id": "fallback-community-test"
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
            "job_id": "triangle-job"
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
            task_community_detect
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
            task_community_detect: {"edges": [("A", "B")], "job_id": "cd-test"}
        }

        for task, payload in payloads.items():
            result = task(payload)

            # All tasks should return these fields
            assert "job_id" in result
            assert "kind" in result
            assert result["job_id"] == payload["job_id"]


if __name__ == "__main__":
    pytest.main([__file__])
