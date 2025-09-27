"""
Sentiment Analysis Pipeline for IntelGraph
Uses HuggingFace transformers for sentiment analysis of entity notes and comments
"""

import logging
from typing import Dict, List, Optional, Union, Any
import asyncio
import os
from datetime import datetime

# Optional imports - graceful degradation if not available
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    logging.warning("HuggingFace transformers not available. Using mock sentiment analysis.")

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    import random

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    """
    Sentiment analysis service for entity notes, comments, and text content
    Supports multiple models and provides confidence scores
    """
    
    def __init__(
        self, 
        model_name: str = "cardiffnlp/twitter-roberta-base-sentiment-latest",
        device: Optional[str] = None,
        batch_size: int = 32,
        max_length: int = 512
    ):
        self.model_name = model_name
        self.batch_size = batch_size
        self.max_length = max_length
        self.pipeline = None
        self.tokenizer = None
        self.model = None
        
        # Determine device
        if device is None:
            if TORCH_AVAILABLE and torch.cuda.is_available():
                self.device = "cuda"
            else:
                self.device = "cpu"
        else:
            self.device = device
            
        # Initialize the pipeline
        self._initialize_pipeline()
        
        logger.info(f"SentimentAnalyzer initialized with model: {model_name}, device: {self.device}")
    
    def _initialize_pipeline(self):
        """Initialize the HuggingFace pipeline or fallback to mock"""
        try:
            if HF_AVAILABLE:
                # Try to load the sentiment analysis pipeline
                self.pipeline = pipeline(
                    "sentiment-analysis",
                    model=self.model_name,
                    device=0 if self.device == "cuda" else -1,
                    return_all_scores=True
                )
                logger.info("HuggingFace sentiment pipeline initialized successfully")
            else:
                logger.warning("HuggingFace not available, using mock sentiment analysis")
                
        except Exception as e:
            logger.error(f"Failed to initialize HuggingFace pipeline: {e}")
            logger.info("Falling back to mock sentiment analysis")
            self.pipeline = None
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of a single text
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dict with sentiment results including label, confidence, and scores
        """
        if not text or not text.strip():
            return self._empty_result()
        
        # Truncate text if too long
        if len(text) > self.max_length:
            text = text[:self.max_length]
        
        try:
            if self.pipeline:
                # Use HuggingFace pipeline
                results = self.pipeline(text)
                return self._format_hf_result(results[0])
            else:
                # Use mock analysis
                return self._mock_sentiment_analysis(text)
                
        except Exception as e:
            logger.error(f"Error analyzing sentiment for text: {e}")
            return self._empty_result()
    
    def analyze_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Analyze sentiment for a batch of texts
        
        Args:
            texts: List of texts to analyze
            
        Returns:
            List of sentiment results
        """
        if not texts:
            return []
        
        # Filter and truncate texts
        processed_texts = []
        for text in texts:
            if text and text.strip():
                if len(text) > self.max_length:
                    text = text[:self.max_length]
                processed_texts.append(text)
            else:
                processed_texts.append("")
        
        results = []
        
        try:
            if self.pipeline:
                # Process in batches
                for i in range(0, len(processed_texts), self.batch_size):
                    batch = processed_texts[i:i + self.batch_size]
                    batch_results = self.pipeline(batch)
                    
                    for j, result in enumerate(batch_results):
                        if processed_texts[i + j]:
                            results.append(self._format_hf_result(result))
                        else:
                            results.append(self._empty_result())
            else:
                # Use mock analysis
                for text in processed_texts:
                    if text:
                        results.append(self._mock_sentiment_analysis(text))
                    else:
                        results.append(self._empty_result())
                        
        except Exception as e:
            logger.error(f"Error in batch sentiment analysis: {e}")
            # Return empty results for all texts
            results = [self._empty_result() for _ in texts]
        
        return results
    
    def analyze_entity_content(self, entity_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze sentiment for all text content associated with an entity
        
        Args:
            entity_data: Entity data including notes, comments, description, etc.
            
        Returns:
            Aggregated sentiment analysis with breakdown by content type
        """
        text_fields = []
        field_mapping = {}
        
        # Extract text from various fields
        if entity_data.get('notes'):
            text_fields.append(entity_data['notes'])
            field_mapping[len(text_fields) - 1] = 'notes'
        
        if entity_data.get('description'):
            text_fields.append(entity_data['description'])
            field_mapping[len(text_fields) - 1] = 'description'
        
        if entity_data.get('comments'):
            if isinstance(entity_data['comments'], list):
                for comment in entity_data['comments']:
                    if isinstance(comment, dict) and comment.get('text'):
                        text_fields.append(comment['text'])
                        field_mapping[len(text_fields) - 1] = f"comment_{len(text_fields) - 1}"
                    elif isinstance(comment, str):
                        text_fields.append(comment)
                        field_mapping[len(text_fields) - 1] = f"comment_{len(text_fields) - 1}"
        
        if not text_fields:
            return {
                'overall_sentiment': 'neutral',
                'overall_confidence': 0.0,
                'field_sentiments': {},
                'summary': 'No text content found for analysis'
            }
        
        # Analyze all text fields
        results = self.analyze_batch(text_fields)
        
        # Aggregate results
        field_sentiments = {}
        sentiment_scores = {'positive': [], 'negative': [], 'neutral': []}
        
        for i, result in enumerate(results):
            field_name = field_mapping.get(i, f'field_{i}')
            field_sentiments[field_name] = result
            
            # Collect scores for aggregation
            if result.get('scores'):
                for sentiment, score in result['scores'].items():
                    sentiment_scores[sentiment].append(score)
        
        # Calculate overall sentiment
        overall_sentiment, overall_confidence = self._aggregate_sentiments(sentiment_scores)
        
        return {
            'overall_sentiment': overall_sentiment,
            'overall_confidence': overall_confidence,
            'field_sentiments': field_sentiments,
            'summary': self._generate_summary(field_sentiments, overall_sentiment, overall_confidence),
            'analyzed_at': datetime.utcnow().isoformat()
        }
    
    def _format_hf_result(self, hf_result: List[Dict]) -> Dict[str, Any]:
        """Format HuggingFace pipeline result"""
        if not hf_result:
            return self._empty_result()
        
        # Convert to standard format
        scores = {}
        best_label = None
        best_score = 0.0
        
        for item in hf_result:
            label = item['label'].lower()
            score = item['score']
            
            # Normalize label names
            if label in ['positive', 'pos', 'label_2']:
                normalized_label = 'positive'
            elif label in ['negative', 'neg', 'label_0']:
                normalized_label = 'negative'
            else:
                normalized_label = 'neutral'
            
            scores[normalized_label] = score
            
            if score > best_score:
                best_score = score
                best_label = normalized_label
        
        return {
            'sentiment': best_label or 'neutral',
            'confidence': best_score,
            'scores': scores,
            'method': 'huggingface'
        }
    
    def _mock_sentiment_analysis(self, text: str) -> Dict[str, Any]:
        """Mock sentiment analysis for scaffold/testing"""
        # Simple heuristic-based mock analysis
        text_lower = text.lower()
        
        positive_words = ['good', 'great', 'excellent', 'positive', 'happy', 'love', 'amazing', 'wonderful']
        negative_words = ['bad', 'terrible', 'awful', 'negative', 'sad', 'hate', 'horrible', 'disappointing']
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            sentiment = 'positive'
            confidence = min(0.6 + (positive_count * 0.1), 0.9)
        elif negative_count > positive_count:
            sentiment = 'negative'
            confidence = min(0.6 + (negative_count * 0.1), 0.9)
        else:
            sentiment = 'neutral'
            confidence = 0.7
        
        # Add some randomness for more realistic mock data
        if NUMPY_AVAILABLE:
            confidence += np.random.uniform(-0.1, 0.1)
        else:
            confidence += random.uniform(-0.1, 0.1)
        
        confidence = max(0.5, min(0.95, confidence))
        
        # Generate score distribution
        if sentiment == 'positive':
            scores = {
                'positive': confidence,
                'negative': (1 - confidence) * 0.3,
                'neutral': (1 - confidence) * 0.7
            }
        elif sentiment == 'negative':
            scores = {
                'negative': confidence,
                'positive': (1 - confidence) * 0.3,
                'neutral': (1 - confidence) * 0.7
            }
        else:
            scores = {
                'neutral': confidence,
                'positive': (1 - confidence) * 0.5,
                'negative': (1 - confidence) * 0.5
            }
        
        return {
            'sentiment': sentiment,
            'confidence': confidence,
            'scores': scores,
            'method': 'mock'
        }
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty/neutral result"""
        return {
            'sentiment': 'neutral',
            'confidence': 0.0,
            'scores': {'positive': 0.33, 'negative': 0.33, 'neutral': 0.34},
            'method': 'empty'
        }
    
    def _aggregate_sentiments(self, sentiment_scores: Dict[str, List[float]]) -> tuple:
        """Aggregate multiple sentiment scores"""
        if not any(sentiment_scores.values()):
            return 'neutral', 0.0
        
        # Calculate average scores
        avg_scores = {}
        for sentiment, scores in sentiment_scores.items():
            if scores:
                avg_scores[sentiment] = sum(scores) / len(scores)
            else:
                avg_scores[sentiment] = 0.0
        
        # Find dominant sentiment
        best_sentiment = max(avg_scores, key=avg_scores.get)
        best_confidence = avg_scores[best_sentiment]
        
        return best_sentiment, best_confidence
    
    def _generate_summary(self, field_sentiments: Dict, overall_sentiment: str, overall_confidence: float) -> str:
        """Generate a summary of the sentiment analysis"""
        num_fields = len(field_sentiments)
        
        if num_fields == 0:
            return "No content analyzed"
        
        confidence_level = "high" if overall_confidence > 0.8 else "medium" if overall_confidence > 0.6 else "low"
        
        return (f"Analyzed {num_fields} text field(s). "
                f"Overall sentiment: {overall_sentiment} "
                f"(confidence: {confidence_level}, {overall_confidence:.2f})")


# Singleton instance for global use
_global_analyzer: Optional[SentimentAnalyzer] = None

def get_sentiment_analyzer() -> SentimentAnalyzer:
    """Get or create global sentiment analyzer instance"""
    global _global_analyzer
    if _global_analyzer is None:
        _global_analyzer = SentimentAnalyzer()
    return _global_analyzer

def analyze_text_sentiment(text: str) -> Dict[str, Any]:
    """Convenience function for single text analysis"""
    analyzer = get_sentiment_analyzer()
    return analyzer.analyze_text(text)

def analyze_entity_sentiment(entity_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for entity sentiment analysis"""
    analyzer = get_sentiment_analyzer()
    return analyzer.analyze_entity_content(entity_data)


# Example usage and testing
if __name__ == "__main__":
    # Test the sentiment analyzer
    analyzer = SentimentAnalyzer()
    
    # Test single text
    test_text = "This is a really great product! I love how it works and would definitely recommend it."
    result = analyzer.analyze_text(test_text)
    print(f"Text: {test_text}")
    print(f"Sentiment: {result['sentiment']} (confidence: {result['confidence']:.3f})")
    print(f"Scores: {result['scores']}")
    print()
    
    # Test entity content
    test_entity = {
        'id': 'test_entity',
        'name': 'Test Entity',
        'description': 'This entity is performing excellently in all metrics.',
        'notes': 'Some concerning issues have been identified that need attention.',
        'comments': [
            {'text': 'Great work on this project!'},
            {'text': 'There are some problems that need to be addressed.'}
        ]
    }
    
    entity_result = analyzer.analyze_entity_content(test_entity)
    print("Entity Analysis:")
    print(f"Overall: {entity_result['overall_sentiment']} (confidence: {entity_result['overall_confidence']:.3f})")
    print(f"Summary: {entity_result['summary']}")
    print("Field breakdown:")
    for field, sentiment in entity_result['field_sentiments'].items():
        print(f"  {field}: {sentiment['sentiment']} ({sentiment['confidence']:.3f})")