"""
Test cases for ML models and algorithms
"""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from app.models import (
    EntityResolver, 
    LinkPredictor, 
    CommunityDetector, 
    TextAnalyzer,
    get_entity_resolver,
    get_link_predictor,
    get_community_detector,
    get_text_analyzer
)


class TestEntityResolver:
    """Test entity resolution functionality"""
    
    def test_entity_resolver_initialization(self):
        """Test EntityResolver can be initialized"""
        resolver = EntityResolver()
        assert resolver is not None
        assert hasattr(resolver, 'use_transformers')
    
    def test_extract_features_basic(self):
        """Test basic feature extraction"""
        resolver = EntityResolver()
        entity = {
            "id": "1",
            "name": "John Doe",
            "attrs": {"email": "john@example.com"}
        }
        
        features = resolver.extract_features(entity)
        assert isinstance(features, np.ndarray)
        assert features.shape[0] > 0
    
    def test_resolve_entities_simple(self):
        """Test entity resolution with simple examples"""
        resolver = EntityResolver()
        entities = [
            {"id": "1", "name": "John Smith"},
            {"id": "2", "name": "J. Smith"},
            {"id": "3", "name": "Jane Doe"}
        ]
        
        matches = resolver.resolve_entities(entities, threshold=0.5)
        assert isinstance(matches, list)
        # Should find some matches between John Smith and J. Smith
        if matches:
            assert all(len(match) == 3 for match in matches)  # (id1, id2, score)
    
    def test_resolve_entities_empty_input(self):
        """Test entity resolution with empty or single entity"""
        resolver = EntityResolver()
        
        # Empty list
        matches = resolver.resolve_entities([], threshold=0.8)
        assert matches == []
        
        # Single entity
        matches = resolver.resolve_entities([{"id": "1", "name": "John"}], threshold=0.8)
        assert matches == []
    
    def test_resolve_entities_threshold_filtering(self):
        """Test that threshold properly filters results"""
        resolver = EntityResolver()
        entities = [
            {"id": "1", "name": "Completely Different Name"},
            {"id": "2", "name": "Totally Unrelated Text"}
        ]
        
        # High threshold should return no matches
        matches = resolver.resolve_entities(entities, threshold=0.95)
        assert len(matches) == 0


class TestLinkPredictor:
    """Test link prediction functionality"""
    
    def test_link_predictor_initialization(self):
        """Test LinkPredictor can be initialized"""
        predictor = LinkPredictor()
        assert predictor is not None
        assert hasattr(predictor, 'methods')
        assert 'adamic_adar' in predictor.methods
    
    def test_predict_links_simple_graph(self):
        """Test link prediction on a simple graph"""
        predictor = LinkPredictor()
        edges = [("A", "B"), ("B", "C"), ("C", "D")]
        
        predictions = predictor.predict_links(edges, method="common_neighbors", top_k=5)
        assert isinstance(predictions, list)
        assert len(predictions) <= 5
        
        if predictions:
            for pred in predictions:
                assert "u" in pred
                assert "v" in pred
                assert "score" in pred
                assert "method" in pred
    
    def test_predict_links_different_methods(self):
        """Test different link prediction methods"""
        predictor = LinkPredictor()
        edges = [("A", "B"), ("B", "C"), ("A", "C"), ("C", "D")]
        
        methods = ["common_neighbors", "jaccard", "adamic_adar", "preferential_attachment"]
        
        for method in methods:
            predictions = predictor.predict_links(edges, method=method, top_k=3)
            assert isinstance(predictions, list)
            if predictions:
                assert predictions[0]["method"] == method
    
    def test_predict_links_empty_graph(self):
        """Test link prediction on empty or single-edge graph"""
        predictor = LinkPredictor()
        
        # Empty edges
        predictions = predictor.predict_links([], top_k=5)
        assert predictions == []
        
        # Single edge
        predictions = predictor.predict_links([("A", "B")], top_k=5)
        assert isinstance(predictions, list)
    
    def test_predict_links_invalid_method(self):
        """Test link prediction with invalid method falls back"""
        predictor = LinkPredictor()
        edges = [("A", "B"), ("B", "C")]
        
        predictions = predictor.predict_links(edges, method="invalid_method", top_k=3)
        assert isinstance(predictions, list)


class TestCommunityDetector:
    """Test community detection functionality"""
    
    def test_community_detector_initialization(self):
        """Test CommunityDetector can be initialized"""
        detector = CommunityDetector()
        assert detector is not None
        assert hasattr(detector, 'algorithms')
        assert 'greedy_modularity' in detector.algorithms
    
    def test_detect_communities_simple_graph(self):
        """Test community detection on a simple graph"""
        detector = CommunityDetector()
        edges = [("A", "B"), ("B", "C"), ("D", "E"), ("E", "F")]
        
        communities = detector.detect_communities(edges, algorithm="greedy_modularity")
        assert isinstance(communities, list)
        
        if communities:
            for comm in communities:
                assert "community_id" in comm
                assert "members" in comm
                assert "size" in comm
                assert "algorithm" in comm
                assert len(comm["members"]) == comm["size"]
    
    def test_detect_communities_different_algorithms(self):
        """Test different community detection algorithms"""
        detector = CommunityDetector()
        edges = [("A", "B"), ("B", "C"), ("C", "A"), ("D", "E"), ("E", "F"), ("F", "D")]
        
        algorithms = ["greedy_modularity", "label_propagation", "louvain"]
        
        for algorithm in algorithms:
            communities = detector.detect_communities(edges, algorithm=algorithm)
            assert isinstance(communities, list)
            if communities:
                assert communities[0]["algorithm"] == algorithm
    
    def test_detect_communities_empty_graph(self):
        """Test community detection on empty graph"""
        detector = CommunityDetector()
        
        communities = detector.detect_communities([])
        assert isinstance(communities, list)
    
    def test_detect_communities_resolution_parameter(self):
        """Test community detection with different resolution values"""
        detector = CommunityDetector()
        edges = [("A", "B"), ("B", "C"), ("C", "D"), ("D", "E")]
        
        # Test different resolution values
        for resolution in [0.5, 1.0, 1.5]:
            communities = detector.detect_communities(edges, algorithm="greedy_modularity", resolution=resolution)
            assert isinstance(communities, list)


class TestTextAnalyzer:
    """Test text analysis functionality"""
    
    def test_text_analyzer_initialization(self):
        """Test TextAnalyzer can be initialized"""
        analyzer = TextAnalyzer()
        assert analyzer is not None
        assert hasattr(analyzer, 'entity_patterns')
    
    def test_extract_entities_email(self):
        """Test email entity extraction"""
        analyzer = TextAnalyzer()
        text = "Contact John at john.doe@example.com for more information."
        
        entities = analyzer.extract_entities(text)
        assert isinstance(entities, list)
        
        # Should find the email
        email_entities = [e for e in entities if e["label"] == "EMAIL"]
        assert len(email_entities) > 0
        assert "john.doe@example.com" in [e["text"] for e in email_entities]
    
    def test_extract_entities_phone(self):
        """Test phone number entity extraction"""
        analyzer = TextAnalyzer()
        text = "Call me at 555-123-4567 or (555) 987-6543."
        
        entities = analyzer.extract_entities(text)
        phone_entities = [e for e in entities if e["label"] == "PHONE"]
        assert len(phone_entities) >= 1
    
    def test_extract_entities_ip_address(self):
        """Test IP address entity extraction"""
        analyzer = TextAnalyzer()
        text = "The server is located at 192.168.1.100 and backup at 10.0.0.1."
        
        entities = analyzer.extract_entities(text)
        ip_entities = [e for e in entities if e["label"] == "IP_ADDRESS"]
        assert len(ip_entities) >= 1
    
    def test_extract_entities_url(self):
        """Test URL entity extraction"""
        analyzer = TextAnalyzer()
        text = "Visit https://example.com or http://test.org for details."
        
        entities = analyzer.extract_entities(text)
        url_entities = [e for e in entities if e["label"] == "URL"]
        assert len(url_entities) >= 1
    
    def test_extract_entities_mixed_content(self):
        """Test entity extraction from mixed content"""
        analyzer = TextAnalyzer()
        text = """
        Contact: john@example.com
        Phone: 555-123-4567
        Website: https://company.com
        Server: 192.168.1.100
        """
        
        entities = analyzer.extract_entities(text)
        assert len(entities) >= 4
        
        # Check we found different types
        labels = [e["label"] for e in entities]
        assert "EMAIL" in labels
        assert "PHONE" in labels
        assert "URL" in labels
        assert "IP_ADDRESS" in labels
    
    def test_extract_entities_empty_text(self):
        """Test entity extraction from empty text"""
        analyzer = TextAnalyzer()
        
        entities = analyzer.extract_entities("")
        assert entities == []
        
        entities = analyzer.extract_entities("   ")
        assert isinstance(entities, list)


class TestModelSingletons:
    """Test singleton pattern for model instances"""
    
    def test_singleton_entity_resolver(self):
        """Test EntityResolver singleton"""
        resolver1 = get_entity_resolver()
        resolver2 = get_entity_resolver()
        assert resolver1 is resolver2
    
    def test_singleton_link_predictor(self):
        """Test LinkPredictor singleton"""
        predictor1 = get_link_predictor()
        predictor2 = get_link_predictor()
        assert predictor1 is predictor2
    
    def test_singleton_community_detector(self):
        """Test CommunityDetector singleton"""
        detector1 = get_community_detector()
        detector2 = get_community_detector()
        assert detector1 is detector2
    
    def test_singleton_text_analyzer(self):
        """Test TextAnalyzer singleton"""
        analyzer1 = get_text_analyzer()
        analyzer2 = get_text_analyzer()
        assert analyzer1 is analyzer2


class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_entity_resolver_malformed_entities(self):
        """Test EntityResolver with malformed entity data"""
        resolver = EntityResolver()
        
        # Entities with missing fields
        malformed_entities = [
            {"id": "1"},  # No name
            {"name": "John"},  # No ID
            {}  # Empty
        ]
        
        # Should not crash
        try:
            matches = resolver.resolve_entities(malformed_entities)
            assert isinstance(matches, list)
        except Exception as e:
            pytest.fail(f"EntityResolver should handle malformed data gracefully: {e}")
    
    def test_text_analyzer_none_input(self):
        """Test TextAnalyzer with None input"""
        analyzer = TextAnalyzer()
        
        try:
            entities = analyzer.extract_entities(None)
            assert isinstance(entities, list)
        except Exception:
            # It's acceptable to raise an exception for None input
            pass


if __name__ == "__main__":
    pytest.main([__file__])