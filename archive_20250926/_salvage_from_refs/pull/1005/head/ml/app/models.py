"""
Advanced ML models for IntelGraph AI workflows
"""
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import networkx as nx
from typing import List, Dict, Any, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class GraphNeuralNetwork(nn.Module):
    """Simple GNN for node embeddings and link prediction"""
    
    def __init__(self, input_dim: int, hidden_dim: int = 128, output_dim: int = 64):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, output_dim)
        self.dropout = nn.Dropout(0.2)
        
    def forward(self, x: torch.Tensor, adj_matrix: torch.Tensor) -> torch.Tensor:
        # Simple graph convolution: H' = D^-1 * A * H * W
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        
        # Graph convolution step
        x = torch.mm(adj_matrix, x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        
        x = self.fc3(x)
        return F.normalize(x, p=2, dim=1)

class EntityResolver:
    """Advanced entity resolution using transformer embeddings"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        try:
            self.model = SentenceTransformer(model_name)
            self.use_transformers = True
        except Exception as e:
            logger.warning(f"Failed to load transformer model: {e}. Using TF-IDF fallback.")
            self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
            self.use_transformers = False
    
    def extract_features(self, entity: Dict[str, Any]) -> np.ndarray:
        """Extract features from entity for similarity computation"""
        text_fields = []
        
        # Combine text fields
        for field in ['name', 'label', 'description', 'alias']:
            if field in entity and entity[field]:
                text_fields.append(str(entity[field]))
        
        # Add attribute values
        if 'attrs' in entity:
            for key, value in entity['attrs'].items():
                if isinstance(value, str):
                    text_fields.append(f"{key}: {value}")
        
        combined_text = " ".join(text_fields)
        
        if self.use_transformers:
            return self.model.encode([combined_text])[0]
        else:
            # Fallback to TF-IDF
            try:
                return self.vectorizer.transform([combined_text]).toarray()[0]
            except:
                # If vectorizer not fitted, fit on this text
                self.vectorizer.fit([combined_text])
                return self.vectorizer.transform([combined_text]).toarray()[0]
    
    def resolve_entities(self, entities: List[Dict[str, Any]], threshold: float = 0.85) -> List[Tuple[str, str, float]]:
        """Find entity pairs that likely refer to the same real-world entity"""
        if len(entities) < 2:
            return []
        
        # Extract features for all entities
        features = []
        for entity in entities:
            try:
                feat = self.extract_features(entity)
                features.append(feat)
            except Exception as e:
                logger.warning(f"Failed to extract features for entity {entity.get('id', 'unknown')}: {e}")
                features.append(np.zeros(384 if self.use_transformers else 1000))
        
        features = np.array(features)
        
        # Compute pairwise similarities
        similarities = cosine_similarity(features)
        
        # Find pairs above threshold
        matches = []
        for i in range(len(entities)):
            for j in range(i + 1, len(entities)):
                sim = similarities[i, j]
                if sim >= threshold:
                    matches.append((entities[i]['id'], entities[j]['id'], float(sim)))
        
        return sorted(matches, key=lambda x: x[2], reverse=True)

class LinkPredictor:
    """Graph-based link prediction using multiple algorithms"""
    
    def __init__(self):
        self.methods = {
            'common_neighbors': self._common_neighbors,
            'jaccard': self._jaccard_coefficient,
            'adamic_adar': self._adamic_adar,
            'preferential_attachment': self._preferential_attachment,
            'resource_allocation': self._resource_allocation
        }
    
    def predict_links(self, edges: List[Tuple[str, str]], 
                     method: str = 'adamic_adar', 
                     top_k: int = 50) -> List[Dict[str, Any]]:
        """Predict missing links in the graph"""
        G = nx.Graph()
        G.add_edges_from(edges)
        
        if method not in self.methods:
            method = 'adamic_adar'
        
        predictor = self.methods[method]
        predictions = list(predictor(G))
        
        # Sort by score and return top K
        predictions.sort(key=lambda x: x[2], reverse=True)
        
        results = []
        for u, v, score in predictions[:top_k]:
            results.append({
                'u': u,
                'v': v,
                'score': float(score),
                'method': method
            })
        
        return results
    
    def _common_neighbors(self, G: nx.Graph):
        """Common neighbors heuristic"""
        for u, v, score in nx.common_neighbor_centrality(G):
            yield u, v, score
    
    def _jaccard_coefficient(self, G: nx.Graph):
        """Jaccard coefficient"""
        for u, v, score in nx.jaccard_coefficient(G):
            yield u, v, score
    
    def _adamic_adar(self, G: nx.Graph):
        """Adamic-Adar index"""
        for u, v, score in nx.adamic_adar_index(G):
            yield u, v, score
    
    def _preferential_attachment(self, G: nx.Graph):
        """Preferential attachment"""
        for u, v, score in nx.preferential_attachment(G):
            yield u, v, score
    
    def _resource_allocation(self, G: nx.Graph):
        """Resource allocation index"""
        for u, v, score in nx.resource_allocation_index(G):
            yield u, v, score

class CommunityDetector:
    """Multi-algorithm community detection"""
    
    def __init__(self):
        self.algorithms = {
            'louvain': self._louvain,
            'greedy_modularity': self._greedy_modularity,
            'label_propagation': self._label_propagation,
            'infomap': self._infomap_fallback
        }
    
    def detect_communities(self, edges: List[Tuple[str, str]], 
                          algorithm: str = 'louvain',
                          resolution: float = 1.0) -> List[Dict[str, Any]]:
        """Detect communities in the graph"""
        G = nx.Graph()
        G.add_edges_from(edges)
        
        if algorithm not in self.algorithms:
            algorithm = 'greedy_modularity'
        
        detector = self.algorithms[algorithm]
        communities = detector(G, resolution)
        
        results = []
        for idx, community in enumerate(communities):
            results.append({
                'community_id': f"community_{idx}",
                'members': list(community),
                'size': len(community),
                'algorithm': algorithm
            })
        
        return results
    
    def _louvain(self, G: nx.Graph, resolution: float):
        """Louvain community detection (fallback to greedy if not available)"""
        try:
            import community as community_louvain
            partition = community_louvain.best_partition(G, resolution=resolution)
            communities = {}
            for node, comm in partition.items():
                if comm not in communities:
                    communities[comm] = []
                communities[comm].append(node)
            return list(communities.values())
        except ImportError:
            logger.warning("python-louvain not available, falling back to greedy modularity")
            return self._greedy_modularity(G, resolution)
    
    def _greedy_modularity(self, G: nx.Graph, resolution: float):
        """Greedy modularity optimization"""
        return list(nx.algorithms.community.greedy_modularity_communities(G, resolution=resolution))
    
    def _label_propagation(self, G: nx.Graph, resolution: float):
        """Label propagation algorithm"""
        return list(nx.algorithms.community.label_propagation_communities(G))
    
    def _infomap_fallback(self, G: nx.Graph, resolution: float):
        """Infomap fallback (uses greedy if infomap not available)"""
        return self._greedy_modularity(G, resolution)

class TextAnalyzer:
    """Advanced text analysis for entity extraction and classification"""
    
    def __init__(self):
        self.entity_patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b\d{3}-\d{3}-\d{4}\b|\b\(\d{3}\)\s*\d{3}-\d{4}\b',
            'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
            'url': r'https?://[^\s<>"{}|\\^`\[\]]+',
            'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'
        }
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract structured entities from text"""
        entities = []
        
        # Extract pattern-based entities
        for entity_type, pattern in self.entity_patterns.items():
            import re
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'text': match.group(),
                    'label': entity_type.upper(),
                    'start': match.start(),
                    'end': match.end(),
                    'confidence': 0.9
                })
        
        # Simple keyword-based entity detection
        keywords = {
            'ORGANIZATION': ['corp', 'inc', 'ltd', 'company', 'organization'],
            'LOCATION': ['street', 'avenue', 'city', 'state', 'country'],
            'PERSON': ['mr', 'mrs', 'dr', 'prof']
        }
        
        words = text.lower().split()
        for entity_type, kws in keywords.items():
            for kw in kws:
                if kw in words:
                    start_idx = text.lower().find(kw)
                    entities.append({
                        'text': kw,
                        'label': entity_type,
                        'start': start_idx,
                        'end': start_idx + len(kw),
                        'confidence': 0.6
                    })
        
        return entities

# Global model instances (lazy loading)
_entity_resolver = None
_link_predictor = None
_community_detector = None
_text_analyzer = None

def get_entity_resolver() -> EntityResolver:
    global _entity_resolver
    if _entity_resolver is None:
        _entity_resolver = EntityResolver()
    return _entity_resolver

def get_link_predictor() -> LinkPredictor:
    global _link_predictor
    if _link_predictor is None:
        _link_predictor = LinkPredictor()
    return _link_predictor

def get_community_detector() -> CommunityDetector:
    global _community_detector
    if _community_detector is None:
        _community_detector = CommunityDetector()
    return _community_detector

def get_text_analyzer() -> TextAnalyzer:
    global _text_analyzer
    if _text_analyzer is None:
        _text_analyzer = TextAnalyzer()
    return _text_analyzer