#!/usr/bin/env python3
"""
Sentiment Analysis Script
Handles sentiment analysis using various NLP models
"""

import argparse
import json
import sys
import warnings
from typing import Any

try:
    import spacy
    import torch
    from textblob import TextBlob
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
except ImportError as e:
    print(json.dumps({"error": f"Required packages not installed: {str(e)}"}))
    sys.exit(1)

warnings.filterwarnings("ignore")


class SentimentAnalyzer:
    def __init__(self, model_name: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"):
        self.model_name = model_name
        self.sentiment_pipeline = None
        self.nlp = None

        try:
            # Load sentiment analysis pipeline
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis", model=model_name, return_all_scores=True
            )
        except Exception as e:
            print(f"Failed to load sentiment model: {e}", file=sys.stderr)
            # Fallback to TextBlob
            self.sentiment_pipeline = None

        try:
            # Load spaCy model for text processing
            self.nlp = spacy.load("en_core_web_sm")
        except:
            print("spaCy model not available", file=sys.stderr)

    def analyze_sentiment(
        self, text: str, language: str = "en", enable_aspects: bool = False
    ) -> dict[str, Any]:
        """Analyze sentiment of text"""
        try:
            if not text.strip():
                return {"error": "Empty text provided"}

            # Primary sentiment analysis
            sentiment_result = self._analyze_primary_sentiment(text)

            # Aspect-based sentiment if enabled
            aspects = []
            if enable_aspects and self.nlp:
                aspects = self._analyze_aspect_sentiment(text)

            # Additional metrics
            emotion_scores = self._analyze_emotions(text)
            subjectivity = self._calculate_subjectivity(text)

            return {
                "sentiment": sentiment_result["label"],
                "score": sentiment_result["score"],
                "confidence": sentiment_result["confidence"],
                "aspects": aspects,
                "emotions": emotion_scores,
                "subjectivity": subjectivity,
                "text_length": len(text),
                "language": language,
            }

        except Exception as e:
            return {"error": f"Sentiment analysis failed: {str(e)}"}

    def _analyze_primary_sentiment(self, text: str) -> dict[str, Any]:
        """Analyze primary sentiment"""
        if self.sentiment_pipeline:
            try:
                # Use transformer model
                results = self.sentiment_pipeline(text)[0]

                # Find the highest scoring sentiment
                best_result = max(results, key=lambda x: x["score"])

                # Map labels to standard format
                label_map = {
                    "LABEL_0": "negative",
                    "LABEL_1": "neutral",
                    "LABEL_2": "positive",
                    "NEGATIVE": "negative",
                    "NEUTRAL": "neutral",
                    "POSITIVE": "positive",
                }

                label = label_map.get(best_result["label"], best_result["label"].lower())
                score = self._convert_to_sentiment_score(label, best_result["score"])

                return {"label": label, "score": score, "confidence": best_result["score"]}

            except Exception as e:
                print(f"Transformer sentiment failed: {e}", file=sys.stderr)

        # Fallback to TextBlob
        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity

            if polarity > 0.1:
                label = "positive"
            elif polarity < -0.1:
                label = "negative"
            else:
                label = "neutral"

            return {"label": label, "score": polarity, "confidence": abs(polarity)}

        except Exception:
            return {"label": "neutral", "score": 0.0, "confidence": 0.0}

    def _convert_to_sentiment_score(self, label: str, confidence: float) -> float:
        """Convert sentiment label and confidence to a score between -1 and 1"""
        if label == "positive":
            return confidence
        elif label == "negative":
            return -confidence
        else:  # neutral
            return 0.0

    def _analyze_aspect_sentiment(self, text: str) -> list[dict[str, Any]]:
        """Analyze aspect-based sentiment"""
        if not self.nlp:
            return []

        try:
            doc = self.nlp(text)
            aspects = []

            # Extract noun phrases as potential aspects
            for chunk in doc.noun_chunks:
                aspect_text = chunk.text.lower().strip()
                if len(aspect_text) > 2:  # Filter very short aspects
                    # Analyze sentiment of sentences containing this aspect
                    aspect_sentiment = self._get_aspect_sentiment(text, aspect_text)

                    aspects.append(
                        {
                            "aspect": aspect_text,
                            "sentiment": aspect_sentiment["label"],
                            "confidence": aspect_sentiment["confidence"],
                        }
                    )

            return aspects[:5]  # Limit to top 5 aspects

        except Exception as e:
            print(f"Aspect sentiment analysis failed: {e}", file=sys.stderr)
            return []

    def _get_aspect_sentiment(self, text: str, aspect: str) -> dict[str, Any]:
        """Get sentiment for a specific aspect"""
        # Find sentences containing the aspect
        sentences = text.split(".")
        relevant_sentences = [s.strip() for s in sentences if aspect in s.lower()]

        if not relevant_sentences:
            return {"label": "neutral", "confidence": 0.0}

        # Analyze sentiment of relevant sentences
        combined_text = ". ".join(relevant_sentences)
        return self._analyze_primary_sentiment(combined_text)

    def _analyze_emotions(self, text: str) -> dict[str, float]:
        """Analyze emotional content"""
        try:
            # Simple emotion detection using keywords
            emotions = {
                "joy": 0.0,
                "anger": 0.0,
                "fear": 0.0,
                "sadness": 0.0,
                "surprise": 0.0,
                "disgust": 0.0,
            }

            # Basic keyword-based emotion detection
            text_lower = text.lower()

            joy_words = ["happy", "joy", "excited", "pleased", "delighted", "glad"]
            anger_words = ["angry", "mad", "furious", "annoyed", "irritated"]
            fear_words = ["afraid", "scared", "worried", "anxious", "nervous"]
            sadness_words = ["sad", "depressed", "disappointed", "upset", "unhappy"]
            surprise_words = ["surprised", "amazed", "shocked", "astonished"]
            disgust_words = ["disgusted", "revolted", "repulsed", "sickened"]

            word_lists = {
                "joy": joy_words,
                "anger": anger_words,
                "fear": fear_words,
                "sadness": sadness_words,
                "surprise": surprise_words,
                "disgust": disgust_words,
            }

            for emotion, words in word_lists.items():
                count = sum(1 for word in words if word in text_lower)
                emotions[emotion] = min(count / len(words), 1.0)

            return emotions

        except Exception:
            return {
                emotion: 0.0
                for emotion in ["joy", "anger", "fear", "sadness", "surprise", "disgust"]
            }

    def _calculate_subjectivity(self, text: str) -> float:
        """Calculate text subjectivity"""
        try:
            blob = TextBlob(text)
            return blob.sentiment.subjectivity
        except:
            return 0.5  # Default to neutral subjectivity


def main():
    parser = argparse.ArgumentParser(description="Sentiment Analysis")
    parser.add_argument("--text", required=True, help="Text to analyze")
    parser.add_argument("--language", default="en", help="Text language")
    parser.add_argument(
        "--enable-aspects", action="store_true", help="Enable aspect-based sentiment"
    )
    parser.add_argument(
        "--model", default="cardiffnlp/twitter-roberta-base-sentiment-latest", help="Model to use"
    )

    args = parser.parse_args()

    analyzer = SentimentAnalyzer(args.model)
    result = analyzer.analyze_sentiment(args.text, args.language, args.enable_aspects)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
