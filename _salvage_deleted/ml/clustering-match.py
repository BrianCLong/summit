#!/usr/bin/env python3
"""
HDBSCAN-based clustering for Entity Resolution probabilistic matching.
Part of the GA Core precision optimization pipeline.
"""

import json
import sys
import numpy as np
import hdbscan
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.spatial.distance import jaro_winkler
import warnings
warnings.filterwarnings('ignore')

def extract_features(entity):
    """Extract features from entity for clustering."""
    features = []
    
    # Name features
    if entity.get('name'):
        features.extend([
            len(entity['name']),
            entity['name'].count(' '),
            int(any(c.isupper() for c in entity['name'])),
            int(any(c.isdigit() for c in entity['name']))
        ])
    else:
        features.extend([0, 0, 0, 0])
    
    # Email features
    if entity.get('email'):
        features.extend([
            len(entity['email']),
            int('@' in entity['email']),
            int('.' in entity['email'].split('@')[-1] if '@' in entity['email'] else False)
        ])
    else:
        features.extend([0, 0, 0])
    
    # Additional identifier features
    features.extend([
        int(bool(entity.get('phone'))),
        int(bool(entity.get('address'))),
        int(bool(entity.get('url'))),
        int(bool(entity.get('socialHandle')))
    ])
    
    return np.array(features)

def compute_similarity_score(entity_a, entity_b):
    """Compute comprehensive similarity score between two entities."""
    scores = {}
    
    # Name similarity (Jaro-Winkler)
    if entity_a.get('name') and entity_b.get('name'):
        name_sim = jaro_winkler(
            entity_a['name'].lower().strip(),
            entity_b['name'].lower().strip()
        )
        scores['name_jaro_winkler'] = name_sim
    
    # Email similarity
    if entity_a.get('email') and entity_b.get('email'):
        if entity_a['email'].lower() == entity_b['email'].lower():
            scores['email_exact'] = 1.0
        else:
            # Domain similarity
            domain_a = entity_a['email'].split('@')[-1] if '@' in entity_a['email'] else ''
            domain_b = entity_b['email'].split('@')[-1] if '@' in entity_b['email'] else ''
            if domain_a and domain_b:
                scores['email_domain'] = 1.0 if domain_a == domain_b else 0.0
    
    # Phone similarity
    if entity_a.get('phone') and entity_b.get('phone'):
        phone_a = ''.join(c for c in str(entity_a['phone']) if c.isdigit())
        phone_b = ''.join(c for c in str(entity_b['phone']) if c.isdigit())
        if phone_a and phone_b:
            scores['phone_exact'] = 1.0 if phone_a == phone_b else 0.0
    
    # Address similarity (simplified)
    if entity_a.get('address') and entity_b.get('address'):
        addr_sim = jaro_winkler(
            entity_a['address'].lower().strip(),
            entity_b['address'].lower().strip()
        )
        scores['address_similarity'] = addr_sim
    
    return scores

def clustering_match(entity_a, entity_b, entity_type='PERSON'):
    """
    Perform HDBSCAN-based clustering match for entity resolution.
    Returns match decision with confidence and explanation.
    """
    
    # Extract features for both entities
    features_a = extract_features(entity_a)
    features_b = extract_features(entity_b)
    
    # Compute similarity scores
    similarity_scores = compute_similarity_score(entity_a, entity_b)
    
    # Create feature matrix for clustering
    feature_matrix = np.array([features_a, features_b])
    
    # Normalize features
    feature_matrix = (feature_matrix - feature_matrix.mean(axis=0)) / (feature_matrix.std(axis=0) + 1e-8)
    
    # Compute distance between entities
    feature_distance = np.linalg.norm(features_a - features_b)
    feature_similarity = 1.0 / (1.0 + feature_distance)
    
    # Weighted combination of similarity scores
    weights = {
        'name_jaro_winkler': 0.35,
        'email_exact': 0.25,
        'phone_exact': 0.15,
        'email_domain': 0.10,
        'address_similarity': 0.10,
        'feature_similarity': 0.05
    }
    
    # Calculate weighted score
    weighted_score = 0.0
    explanation = {}
    
    for score_name, score_value in similarity_scores.items():
        if score_name in weights:
            weighted_score += score_value * weights[score_name]
            explanation[score_name] = score_value
    
    # Add feature similarity
    weighted_score += feature_similarity * weights['feature_similarity']
    explanation['feature_similarity'] = feature_similarity
    
    # Entity type specific thresholds
    thresholds = {
        'PERSON': 0.75,
        'ORG': 0.70,
        'LOCATION': 0.65,
        'ARTIFACT': 0.60
    }
    
    threshold = thresholds.get(entity_type, 0.70)
    
    # Clustering-based confidence adjustment
    # If entities are very similar or very different, adjust confidence
    if weighted_score > 0.9:
        confidence = min(0.95, weighted_score + 0.05)
        risk_score = 0.05
    elif weighted_score < 0.3:
        confidence = max(0.05, weighted_score - 0.05)
        risk_score = 0.95
    else:
        # Use HDBSCAN for uncertain cases
        try:
            # Create synthetic data points around our entities for clustering
            noise_scale = 0.1
            synthetic_data = []
            
            for _ in range(10):
                # Add noise to entity A features
                noisy_a = features_a + np.random.normal(0, noise_scale, len(features_a))
                synthetic_data.append(noisy_a)
                
                # Add noise to entity B features  
                noisy_b = features_b + np.random.normal(0, noise_scale, len(features_b))
                synthetic_data.append(noisy_b)
            
            synthetic_matrix = np.array(synthetic_data)
            all_data = np.vstack([feature_matrix, synthetic_matrix])
            
            # Apply HDBSCAN clustering
            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=3,
                min_samples=2,
                cluster_selection_epsilon=0.5
            )
            cluster_labels = clusterer.fit_predict(all_data)
            
            # Check if original entities are in same cluster
            entity_a_cluster = cluster_labels[0]
            entity_b_cluster = cluster_labels[1]
            
            if entity_a_cluster != -1 and entity_a_cluster == entity_b_cluster:
                # Same cluster - boost confidence
                confidence = min(0.9, weighted_score + 0.15)
                risk_score = max(0.1, 1.0 - confidence)
            else:
                # Different clusters - reduce confidence
                confidence = max(0.1, weighted_score - 0.1)
                risk_score = min(0.9, 1.0 - confidence)
            
            explanation['clustering_boost'] = entity_a_cluster == entity_b_cluster
            
        except Exception as e:
            # Fallback if clustering fails
            confidence = weighted_score
            risk_score = 1.0 - weighted_score
            explanation['clustering_error'] = str(e)
    
    # Final decision
    match = confidence >= threshold
    
    return {
        'score': weighted_score,
        'confidence': confidence,
        'match': match,
        'explanation': explanation,
        'riskScore': risk_score,
        'threshold': threshold,
        'method': 'hdbscan_clustering'
    }

def main():
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Usage: clustering-match.py <entity_a_json> <entity_b_json> <entity_type>'}))
        sys.exit(1)
    
    try:
        entity_a = json.loads(sys.argv[1])
        entity_b = json.loads(sys.argv[2])
        entity_type = sys.argv[3]
        
        result = clustering_match(entity_a, entity_b, entity_type)
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'score': 0.0,
            'confidence': 0.0,
            'match': False,
            'explanation': {'error': str(e)},
            'riskScore': 1.0
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()