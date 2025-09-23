#!/usr/bin/env python3
"""
Text Embedding Generation Script
Handles text embedding generation using Sentence Transformers
"""

import argparse
import json
import logging
import os
import sys
import warnings
from typing import Any

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("transformers").setLevel(logging.ERROR)


class TextEmbeddingGenerator:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", device: str = "auto"):
        """Initialize text embedding generator"""
        self.model_name = model_name
        self.device = self._get_device(device)
        self.model = self._load_model(model_name)
        self.tokenizer = None

    def _get_device(self, device: str) -> str:
        """Determine the best device to use"""
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return device

    def _load_model(self, model_name: str):
        """Load sentence transformer or transformers model"""
        try:
            # Try SentenceTransformer first
            if not model_name.startswith("sentence-transformers/"):
                model_name = f"sentence-transformers/{model_name}"

            model = SentenceTransformer(model_name, device=self.device)
            return model

        except Exception as e:
            print(f"Failed to load SentenceTransformer model: {e}", file=sys.stderr)

            try:
                # Fallback to transformers model
                from transformers import AutoModel, AutoTokenizer

                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = AutoModel.from_pretrained(model_name)
                model = model.to(self.device)
                model.eval()
                return model

            except Exception as e2:
                print(f"Failed to load transformers model: {e2}", file=sys.stderr)
                # Ultimate fallback
                model = SentenceTransformer("all-MiniLM-L6-v2", device=self.device)
                return model

    def generate_embedding(
        self, text: str, normalize: bool = True, pooling_strategy: str = "mean"
    ) -> dict[str, Any]:
        """Generate embedding for single text"""
        try:
            # Clean input text
            text = self._preprocess_text(text)

            if not text.strip():
                return {"embedding": [], "dimension": 0, "error": "Empty text provided"}

            # Generate embedding
            if isinstance(self.model, SentenceTransformer):
                embedding = self._generate_sentence_transformer_embedding(
                    text, normalize, pooling_strategy
                )
            else:
                embedding = self._generate_transformers_embedding(text, normalize, pooling_strategy)

            return {
                "embedding": embedding.tolist() if isinstance(embedding, np.ndarray) else embedding,
                "dimension": len(embedding),
                "model": self.model_name,
                "text_length": len(text),
            }

        except Exception as e:
            return {
                "embedding": [],
                "dimension": 0,
                "error": f"Embedding generation failed: {str(e)}",
            }

    def generate_embeddings_batch(
        self,
        texts: list[str],
        normalize: bool = True,
        pooling_strategy: str = "mean",
        batch_size: int = 32,
    ) -> dict[str, Any]:
        """Generate embeddings for multiple texts"""
        try:
            # Clean input texts
            texts = [self._preprocess_text(text) for text in texts]
            texts = [text for text in texts if text.strip()]  # Remove empty texts

            if not texts:
                return {"embeddings": [], "dimensions": [], "error": "No valid texts provided"}

            embeddings = []

            # Process in batches
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i : i + batch_size]

                if isinstance(self.model, SentenceTransformer):
                    batch_embeddings = self._generate_sentence_transformer_embeddings_batch(
                        batch_texts, normalize, pooling_strategy
                    )
                else:
                    batch_embeddings = self._generate_transformers_embeddings_batch(
                        batch_texts, normalize, pooling_strategy
                    )

                embeddings.extend(batch_embeddings)

            return {
                "embeddings": [
                    emb.tolist() if isinstance(emb, np.ndarray) else emb for emb in embeddings
                ],
                "dimensions": [len(emb) for emb in embeddings],
                "model": self.model_name,
                "batch_size": len(texts),
            }

        except Exception as e:
            return {
                "embeddings": [],
                "dimensions": [],
                "error": f"Batch embedding generation failed: {str(e)}",
            }

    def _generate_sentence_transformer_embedding(
        self, text: str, normalize: bool, pooling_strategy: str
    ) -> np.ndarray:
        """Generate embedding using SentenceTransformer"""
        embedding = self.model.encode(
            text, normalize_embeddings=normalize, convert_to_numpy=True, show_progress_bar=False
        )
        return embedding

    def _generate_sentence_transformer_embeddings_batch(
        self, texts: list[str], normalize: bool, pooling_strategy: str
    ) -> list[np.ndarray]:
        """Generate embeddings using SentenceTransformer batch processing"""
        embeddings = self.model.encode(
            texts, normalize_embeddings=normalize, convert_to_numpy=True, show_progress_bar=False
        )
        return [embeddings[i] for i in range(len(embeddings))]

    def _generate_transformers_embedding(
        self, text: str, normalize: bool, pooling_strategy: str
    ) -> np.ndarray:
        """Generate embedding using transformers model"""
        if self.tokenizer is None:
            raise ValueError("Tokenizer not loaded for transformers model")

        # Tokenize
        inputs = self.tokenizer(
            text, return_tensors="pt", truncation=True, padding=True, max_length=512
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Generate embedding
        with torch.no_grad():
            outputs = self.model(**inputs)

            # Apply pooling strategy
            if pooling_strategy == "mean":
                # Mean pooling
                token_embeddings = outputs.last_hidden_state
                attention_mask = inputs["attention_mask"]
                input_mask_expanded = (
                    attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
                )
                sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
                sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
                embedding = sum_embeddings / sum_mask

            elif pooling_strategy == "max":
                # Max pooling
                token_embeddings = outputs.last_hidden_state
                attention_mask = inputs["attention_mask"]
                input_mask_expanded = (
                    attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
                )
                token_embeddings[input_mask_expanded == 0] = -1e9
                embedding = torch.max(token_embeddings, 1)[0]

            elif pooling_strategy == "cls":
                # CLS token
                embedding = outputs.last_hidden_state[:, 0, :]

            else:
                # Default to mean pooling
                token_embeddings = outputs.last_hidden_state
                embedding = torch.mean(token_embeddings, dim=1)

        # Normalize if requested
        if normalize:
            embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)

        return embedding.cpu().numpy()[0]

    def _generate_transformers_embeddings_batch(
        self, texts: list[str], normalize: bool, pooling_strategy: str
    ) -> list[np.ndarray]:
        """Generate embeddings using transformers model batch processing"""
        if self.tokenizer is None:
            raise ValueError("Tokenizer not loaded for transformers model")

        # Tokenize batch
        inputs = self.tokenizer(
            texts, return_tensors="pt", truncation=True, padding=True, max_length=512
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Generate embeddings
        with torch.no_grad():
            outputs = self.model(**inputs)

            # Apply pooling strategy
            if pooling_strategy == "mean":
                # Mean pooling
                token_embeddings = outputs.last_hidden_state
                attention_mask = inputs["attention_mask"]
                input_mask_expanded = (
                    attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
                )
                sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
                sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
                embeddings = sum_embeddings / sum_mask

            elif pooling_strategy == "max":
                # Max pooling
                token_embeddings = outputs.last_hidden_state
                attention_mask = inputs["attention_mask"]
                input_mask_expanded = (
                    attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
                )
                token_embeddings[input_mask_expanded == 0] = -1e9
                embeddings = torch.max(token_embeddings, 1)[0]

            elif pooling_strategy == "cls":
                # CLS token
                embeddings = outputs.last_hidden_state[:, 0, :]

            else:
                # Default to mean pooling
                embeddings = torch.mean(outputs.last_hidden_state, dim=1)

        # Normalize if requested
        if normalize:
            embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

        embeddings_np = embeddings.cpu().numpy()
        return [embeddings_np[i] for i in range(len(embeddings_np))]

    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for embedding generation"""
        if not isinstance(text, str):
            text = str(text)

        # Basic cleaning
        text = text.strip()

        # Remove excessive whitespace
        import re

        text = re.sub(r"\s+", " ", text)

        return text

    def calculate_similarity(
        self, embedding1: list[float], embedding2: list[float], metric: str = "cosine"
    ) -> float:
        """Calculate similarity between two embeddings"""
        try:
            emb1 = np.array(embedding1)
            emb2 = np.array(embedding2)

            if metric == "cosine":
                # Cosine similarity
                dot_product = np.dot(emb1, emb2)
                norm1 = np.linalg.norm(emb1)
                norm2 = np.linalg.norm(emb2)
                if norm1 == 0 or norm2 == 0:
                    return 0.0
                return float(dot_product / (norm1 * norm2))

            elif metric == "euclidean":
                # Euclidean distance (converted to similarity)
                distance = np.linalg.norm(emb1 - emb2)
                return float(1.0 / (1.0 + distance))

            elif metric == "manhattan":
                # Manhattan distance (converted to similarity)
                distance = np.sum(np.abs(emb1 - emb2))
                return float(1.0 / (1.0 + distance))

            else:
                # Default to cosine
                return self.calculate_similarity(embedding1, embedding2, "cosine")

        except Exception as e:
            print(f"Similarity calculation failed: {e}", file=sys.stderr)
            return 0.0

    def get_model_info(self) -> dict[str, Any]:
        """Get information about the loaded model"""
        info = {
            "model_name": self.model_name,
            "device": self.device,
            "model_type": (
                "SentenceTransformer"
                if isinstance(self.model, SentenceTransformer)
                else "Transformers"
            ),
        }

        # Try to get embedding dimension
        try:
            test_embedding = self.generate_embedding("test")
            info["embedding_dimension"] = test_embedding["dimension"]
        except:
            info["embedding_dimension"] = "unknown"

        return info


def main():
    parser = argparse.ArgumentParser(description="Text Embedding Generation")
    parser.add_argument("--text", required=True, help="Text to generate embedding for")
    parser.add_argument("--model", default="all-MiniLM-L6-v2", help="Model to use")
    parser.add_argument("--device", default="auto", help="Device to use (auto, cpu, cuda)")
    parser.add_argument("--normalize", action="store_true", help="Normalize embeddings")
    parser.add_argument(
        "--pooling", default="mean", choices=["mean", "max", "cls"], help="Pooling strategy"
    )
    parser.add_argument("--batch", help="File with texts (one per line) for batch processing")
    parser.add_argument("--similarity", help="Compare with another text (comma-separated)")
    parser.add_argument("--show-info", action="store_true", help="Show model information")

    args = parser.parse_args()

    try:
        # Initialize embedding generator
        generator = TextEmbeddingGenerator(args.model, args.device)

        # Show model info if requested
        if args.show_info:
            model_info = generator.get_model_info()
            print(json.dumps(model_info, indent=2))
            return

        # Batch processing
        if args.batch and os.path.exists(args.batch):
            with open(args.batch, encoding="utf-8") as f:
                texts = [line.strip() for line in f if line.strip()]

            result = generator.generate_embeddings_batch(
                texts, normalize=args.normalize, pooling_strategy=args.pooling
            )
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return

        # Single text processing
        result = generator.generate_embedding(
            args.text, normalize=args.normalize, pooling_strategy=args.pooling
        )

        # Calculate similarity if requested
        if args.similarity:
            other_texts = [text.strip() for text in args.similarity.split(",")]
            similarities = []

            for other_text in other_texts:
                other_result = generator.generate_embedding(
                    other_text, args.normalize, args.pooling
                )
                if other_result.get("embedding"):
                    similarity = generator.calculate_similarity(
                        result["embedding"], other_result["embedding"]
                    )
                    similarities.append({"text": other_text, "similarity": similarity})

            result["similarities"] = similarities

        print(json.dumps(result, indent=2, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": f"Embedding generation failed: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
