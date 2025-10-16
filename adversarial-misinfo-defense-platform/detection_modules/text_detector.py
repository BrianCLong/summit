"""
Text Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of adversarial text-based misinformation using
advanced NLP techniques, pattern matching, and adversarial sample generation.
"""
import numpy as np
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict, Any, Optional
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import random
import string


class AdversarialTextGAN(nn.Module):
    """
    Simple GAN for generating adversarial text samples for training
    """
    def __init__(self, vocab_size: int, embed_dim: int = 100, hidden_dim: int = 128):
        super(AdversarialTextGAN, self).__init__()
        self.generator = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, vocab_size),
            nn.Softmax(dim=-1)
        )
        
        self.discriminator = nn.Sequential(
            nn.Linear(vocab_size, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        generated = self.generator(x)
        return self.discriminator(generated)


class TextDetector:
    """
    Detection module for textual misinformation and adversarial samples
    """
    
    def __init__(self, model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"):
        """
        Initialize the text detector with pre-trained models
        """
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.tfidf = TfidfVectorizer(max_features=10000, ngram_range=(1, 3))
        self.classifier = MultinomialNB()
        self.patterns = []
        self.adversarial_gan = None
        
        # Initialize with common misinformation patterns
        self._initialize_patterns()
        
    def _initialize_patterns(self):
        """Initialize with common misinformation patterns"""
        self.patterns = [
            # Emotional manipulation patterns
            r"(?!.*\b(?:research|study|evidence)\b)i(?:ncredibl|ncredibl|ncredibl|ncredibl|ncredibl|ncredibl|ncredi|ncredi|ncredi|ncredi|ncredi)e",
            r"you won't believe",
            r"shocking revelation",
            r"they don't want you to know",
            r"breaking:?",
            r"urgent(?:ly)?",
            # Source credibility issues
            r"anonymou?s? source",
            r"not (?:yet )?confirmed",
            # Call to action patterns
            r"share if you agree",
            r"tag someone who",
            r"comment if you",
            # False authority claims
            r"doctors say",
            r"scientists discovered",
            r"researchers found",
        ]
        
    def detect_patterns(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect known misinformation patterns in text
        """
        results = []
        for i, pattern in enumerate(self.patterns):
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                results.append({
                    'pattern_id': i,
                    'pattern': pattern,
                    'match': match.group(),
                    'start': match.start(),
                    'end': match.end(),
                    'confidence': 0.7  # Base confidence for pattern matching
                })
        return results
        
    def extract_features(self, text: str) -> np.ndarray:
        """
        Extract features from text for classification
        """
        # Basic linguistic features
        features = []
        
        # Length-based features
        features.append(len(text))
        features.append(len(text.split()))
        features.append(len([c for c in text if c.isupper()]) / len(text) if text else 0)
        features.append(len(re.findall(r'[!?.]{2,}', text)))
        features.append(len(re.findall(r'\b(?:fake|hoax|conspiracy|scam|lie)\b', text, re.IGNORECASE)))
        
        # Sentiment indicators
        features.append(len(re.findall(r'\b(?:shocking|unbelievable|incredible|unprecedented|crazy)\b', 
                                      text, re.IGNORECASE)))
        features.append(len(re.findall(r'\b(?:urgent|must|need|crisis|emergency)\b', 
                                      text, re.IGNORECASE)))
        
        return np.array(features)
        
    def detect_misinfo(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Main detection function for misinformation
        """
        results = []
        
        for text in texts:
            # Pattern detection
            pattern_results = self.detect_patterns(text)
            
            # Feature extraction
            features = self.extract_features(text)
            
            # Transformer-based analysis (simplified)
            inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)
                # Assuming binary classification (misinfo vs non-misinfo)
                misinfo_score = probabilities[0][1].item()  # Score for "misinfo" class
            
            # Aggregate results
            result = {
                'text': text[:100] + "..." if len(text) > 100 else text,  # Truncated for display
                'misinfo_score': misinfo_score,
                'features': features.tolist(),
                'patterns_found': len(pattern_results),
                'pattern_details': pattern_results,
                'confidence': 0.6 * misinfo_score + 0.4 * min(1.0, len(pattern_results) * 0.3)
            }
            
            results.append(result)
            
        return results
    
    def generate_adversarial_samples(self, base_texts: List[str], num_samples: int = 10) -> List[str]:
        """
        Generate adversarial text samples for training improvement
        """
        if self.adversarial_gan is None:
            # Initialize a simple GAN for demonstration
            vocab_size = 30522  # BERT vocab size
            self.adversarial_gan = AdversarialTextGAN(vocab_size)
        
        adversarial_texts = []
        
        for _ in range(num_samples):
            # Simple adversarial text generation (in practice, this would use real NLP GAN techniques)
            base_text = random.choice(base_texts)
            
            # Create adversarial variants by making small changes
            adversarial_variants = [
                self._create_synonym_variant(base_text),
                self._create_emoji_variant(base_text),
                self._create_punctuation_variant(base_text),
                self._create_capitalization_variant(base_text)
            ]
            
            # Randomly select one variant
            selected_variant = random.choice(adversarial_variants)
            adversarial_texts.append(selected_variant)
        
        return adversarial_texts
    
    def _create_synonym_variant(self, text: str) -> str:
        """Create variant by substituting some words with synonyms"""
        # Simplified synonym substitution (in practice, use WordNet or similar)
        synonyms = {
            "incredible": ["amazing", "astounding", "remarkable", "extraordinary"],
            "shocking": ["stunning", "astounding", "breathtaking", "sensational"],
            "breaking": ["latest", "recent", "new", "fresh"],
            "urgent": ["important", "pressing", "critical", "vital"]
        }
        
        result = text
        for word, syns in synonyms.items():
            if word.lower() in result.lower():
                result = result.replace(word, random.choice(syns))
        
        return result
    
    def _create_emoji_variant(self, text: str) -> str:
        """Add relevant emojis to text"""
        emojis = ["🚨", "⚠️", "💥", "🔥", "🤯", "😱", "😳", "❓", "❗", "❗❗"]
        return f"{random.choice(emojis)} {text} {random.choice(emojis)}"
    
    def _create_punctuation_variant(self, text: str) -> str:
        """Add excessive punctuation"""
        return re.sub(r'([.!?])', r'\1\1\1', text)
    
    def _create_capitalization_variant(self, text: str) -> str:
        """Randomly change capitalization"""
        result = ""
        for char in text:
            if char.isalpha():
                result += char.upper() if random.random() > 0.5 else char.lower()
            else:
                result += char
        return result
    
    def update_patterns(self, new_patterns: List[str]):
        """
        Update detection patterns based on new adversarial samples
        """
        self.patterns.extend(new_patterns)
        # Remove duplicates
        self.patterns = list(set(self.patterns))
        
    def fine_tune_model(self, training_texts: List[str], labels: List[int]):
        """
        Fine-tune the underlying model with new data
        """
        # In a real implementation, this would perform proper fine-tuning
        # Here we just extract TF-IDF features and train a simple classifier
        X = self.tfidf.fit_transform(training_texts)
        self.classifier.fit(X, labels)
        
        # Generate adversarial samples and retrain
        adversarial_texts = self.generate_adversarial_samples(training_texts, num_samples=5)
        adversarial_labels = [1] * len(adversarial_texts)  # All adversarial texts are misinfo
        
        # Retrain with adversarial samples
        all_texts = training_texts + adversarial_texts
        all_labels = labels + adversarial_labels
        
        X_all = self.tfidf.fit_transform(all_texts)
        self.classifier.fit(X_all, all_labels)