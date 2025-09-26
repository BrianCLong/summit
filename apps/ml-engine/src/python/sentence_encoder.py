#!/usr/bin/env python3
"""
Sentence Transformer Encoder for Entity Resolution
Provides semantic embeddings for entity matching using pre-trained models
"""

import json
import logging
import os
import statistics
import sys
import time
from typing import Dict, List, Optional

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

from gpu_utils import (
    GPUDeviceInfo,
    collect_gpu_telemetry,
    log_available_gpus,
    resolve_device,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SentenceEncoder:
    """
    Wrapper for sentence transformer models optimized for entity resolution
    """
    
    def __init__(
        self,
        model_name: str = 'all-MiniLM-L6-v2',
        device_preference: Optional[str] = None,
        use_half_precision: Optional[bool] = None,
    ):
        """
        Initialize the sentence encoder with a pre-trained model
        
        Args:
            model_name: Name of the sentence transformer model
        """
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.device_info: Optional[GPUDeviceInfo]
        self.device, self.device_info = resolve_device(device_preference)
        if use_half_precision is not None:
            self.use_half_precision = use_half_precision
        else:
            half_precision_env = os.getenv('GPU_HALF_PRECISION', 'true').lower()
            self.use_half_precision = (
                half_precision_env in {'true', '1', 'yes'} and self.device.startswith('cuda')
            )

        log_available_gpus()
        
        try:
            self._load_model()
            logger.info(f"Sentence encoder initialized with {model_name} on {self.device}")
        except Exception as e:
            logger.error(f"Failed to initialize sentence encoder: {e}")
            raise
    
    def _load_model(self) -> None:
        """Load the sentence transformer model"""
        logger.info(
            "Loading sentence transformer model %s on device %s",
            self.model_name,
            self.device,
        )

        self.model = SentenceTransformer(
            self.model_name,
            device=self.device,
            cache_folder=os.getenv('MODEL_CACHE_DIR'),
        )

        # Optimisations for inference workloads
        self.model.eval()
        if self.device.startswith('cuda'):
            torch.backends.cudnn.benchmark = True
            if self.use_half_precision:
                self.model.half()
            torch.cuda.empty_cache()

        # Run a short warm-up to avoid measuring lazy initialisation
        self._warmup()
    
    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Encode texts into semantic embeddings
        
        Args:
            texts: List of text strings to encode
            batch_size: Batch size for processing
            
        Returns:
            numpy array of embeddings
        """
        if not self.model:
            raise RuntimeError("Model not initialized")
        
        try:
            cleaned_texts = [self._preprocess_text(text) for text in texts]

            start = time.perf_counter()
            with torch.inference_mode():
                if self.device.startswith('cuda') and self.use_half_precision:
                    with torch.autocast(device_type='cuda', dtype=torch.float16):
                        embeddings = self.model.encode(
                            cleaned_texts,
                            batch_size=batch_size,
                            show_progress_bar=len(texts) > 100,
                            convert_to_numpy=True,
                            normalize_embeddings=True,
                        )
                else:
                    embeddings = self.model.encode(
                        cleaned_texts,
                        batch_size=batch_size,
                        show_progress_bar=len(texts) > 100,
                        convert_to_numpy=True,
                        normalize_embeddings=True,
                    )
            duration_ms = (time.perf_counter() - start) * 1000

            logger.info(
                "Generated embeddings for %s texts (shape=%s) in %.2f ms on %s",
                len(texts),
                embeddings.shape,
                duration_ms,
                self.device,
            )

            telemetry = self.gpu_telemetry()
            if telemetry:
                logger.debug("GPU telemetry after encode: %s", telemetry)

            return embeddings

        except Exception as e:
            logger.error(f"Error encoding texts: {e}")
            raise
        finally:
            if self.device.startswith('cuda'):
                torch.cuda.synchronize()
    
    def encode_single(self, text: str) -> np.ndarray:
        """
        Encode a single text string
        
        Args:
            text: Text string to encode
            
        Returns:
            numpy array embedding
        """
        return self.encode([text])[0]
    
    def similarity(self, text1: str, text2: str) -> float:
        """
        Calculate semantic similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Cosine similarity score between 0 and 1
        """
        embeddings = self.encode([text1, text2])
        return float(np.dot(embeddings[0], embeddings[1]))
    
    def find_similar(self, query: str, candidates: List[str], top_k: int = 5) -> List[tuple]:
        """
        Find most similar texts from candidates
        
        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of top results to return
            
        Returns:
            List of (index, similarity_score) tuples
        """
        if not candidates:
            return []
        
        # Encode query and candidates
        all_texts = [query] + candidates
        embeddings = self.encode(all_texts)
        
        query_embedding = embeddings[0]
        candidate_embeddings = embeddings[1:]
        
        # Calculate similarities
        similarities = np.dot(candidate_embeddings, query_embedding)
        
        # Get top-k results
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = [(idx, float(similarities[idx])) for idx in top_indices]
        
        return results

    def benchmark(
        self,
        texts: List[str],
        runs: int = 5,
        warmup_runs: int = 2,
        batch_size: int = 32,
    ) -> Dict[str, float]:
        """Benchmark inference throughput for the provided texts."""

        durations: List[float] = []

        for _ in range(warmup_runs):
            self.encode(texts, batch_size=batch_size)

        for _ in range(runs):
            start = time.perf_counter()
            self.encode(texts, batch_size=batch_size)
            durations.append((time.perf_counter() - start) * 1000)

        telemetry = self.gpu_telemetry() or {}

        return {
            'device': self.device,
            'runs': runs,
            'batchSize': batch_size,
            'medianMs': statistics.median(durations),
            'p95Ms': float(np.percentile(durations, 95)),
            'meanMs': statistics.fmean(durations),
            'stdevMs': statistics.pstdev(durations),
            'telemetry': telemetry,
        }

    def gpu_telemetry(self) -> Optional[Dict[str, float]]:
        """Return telemetry for the active GPU, if applicable."""

        if not self.device.startswith('cuda') or self.device_info is None:
            return None

        telemetry = collect_gpu_telemetry(self.device_info.index) or {}
        telemetry.update(
            {
                'name': self.device_info.name,
                'totalMemoryMb': self.device_info.total_memory_mb,
            }
        )
        return telemetry

    def _warmup(self) -> None:
        """Execute a light-weight warm-up pass to prime the runtime."""

        try:
            sample_texts = [
                "IntelGraph accelerates intelligence fusion.",
                "Entity resolution benefits from semantic embeddings.",
            ]
            self.encode(sample_texts, batch_size=2)
        except Exception as exc:
            logger.debug("Warm-up failed (non-fatal): %s", exc)
    
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text for better embedding quality
        
        Args:
            text: Raw text string
            
        Returns:
            Preprocessed text
        """
        if not isinstance(text, str):
            text = str(text)
        
        # Basic cleaning
        text = text.strip()
        
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Truncate if too long (BERT models have token limits)
        if len(text) > 500:
            text = text[:500]
        
        return text
    
    def get_model_info(self) -> dict:
        """
        Get information about the loaded model
        
        Returns:
            Dictionary with model information
        """
        if not self.model:
            return {"error": "Model not initialized"}
        
        return {
            "model_name": self.model_name,
            "device": self.device,
            "max_seq_length": self.model.max_seq_length,
            "embedding_dimension": self.model.get_sentence_embedding_dimension(),
            "tokenizer_vocab_size": len(self.model.tokenizer.get_vocab()) if hasattr(self.model, 'tokenizer') else None
        }


# Global encoder instance for reuse
_encoder_instance: Optional[SentenceEncoder] = None

def get_encoder(model_name: str = 'all-MiniLM-L6-v2') -> SentenceEncoder:
    """
    Get or create a global encoder instance
    
    Args:
        model_name: Name of the sentence transformer model
        
    Returns:
        SentenceEncoder instance
    """
    global _encoder_instance
    
    if _encoder_instance is None or _encoder_instance.model_name != model_name:
        _encoder_instance = SentenceEncoder(model_name)
    
    return _encoder_instance

def encode_sentences(texts: List[str], model_name: str = 'all-MiniLM-L6-v2') -> np.ndarray:
    """
    Convenience function to encode sentences
    
    Args:
        texts: List of text strings
        model_name: Name of the sentence transformer model
        
    Returns:
        numpy array of embeddings
    """
    encoder = get_encoder(model_name)
    return encoder.encode(texts)

def calculate_similarity_matrix(texts: List[str], model_name: str = 'all-MiniLM-L6-v2') -> np.ndarray:
    """
    Calculate similarity matrix for a list of texts
    
    Args:
        texts: List of text strings
        model_name: Name of the sentence transformer model
        
    Returns:
        Symmetric similarity matrix
    """
    encoder = get_encoder(model_name)
    embeddings = encoder.encode(texts)
    
    # Calculate cosine similarity matrix
    similarity_matrix = np.dot(embeddings, embeddings.T)
    
    return similarity_matrix

def find_duplicates(texts: List[str], threshold: float = 0.85, model_name: str = 'all-MiniLM-L6-v2') -> List[tuple]:
    """
    Find potential duplicates in a list of texts
    
    Args:
        texts: List of text strings
        threshold: Similarity threshold for duplicates
        model_name: Name of the sentence transformer model
        
    Returns:
        List of (index1, index2, similarity) tuples for potential duplicates
    """
    similarity_matrix = calculate_similarity_matrix(texts, model_name)
    duplicates = []
    
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            similarity = similarity_matrix[i][j]
            if similarity >= threshold:
                duplicates.append((i, j, float(similarity)))
    
    # Sort by similarity score descending
    duplicates.sort(key=lambda x: x[2], reverse=True)
    
    return duplicates

def batch_entity_similarity(entity_texts: List[str], batch_size: int = 100, model_name: str = 'all-MiniLM-L6-v2') -> np.ndarray:
    """
    Process large batches of entity texts for similarity calculation
    
    Args:
        entity_texts: List of entity text representations
        batch_size: Batch size for processing
        model_name: Name of the sentence transformer model
        
    Returns:
        Embeddings array
    """
    encoder = get_encoder(model_name)
    
    all_embeddings = []
    for i in range(0, len(entity_texts), batch_size):
        batch = entity_texts[i:i + batch_size]
        batch_embeddings = encoder.encode(batch, batch_size=min(batch_size, len(batch)))
        all_embeddings.append(batch_embeddings)
        
        logger.info(f"Processed batch {i//batch_size + 1}/{(len(entity_texts) + batch_size - 1)//batch_size}")
    
    return np.vstack(all_embeddings)


def main():
    """
    Command line interface for the sentence encoder
    """
    if len(sys.argv) < 2:
        print("Usage: python sentence_encoder.py <command> [args...]")
        print("Commands:")
        print("  encode <text1> [text2] ... - Encode texts and return embeddings")
        print("  similarity <text1> <text2> - Calculate similarity between two texts")
        print("  find_similar <query> <candidate1> [candidate2] ... - Find similar texts")
        print("  info - Show model information")
        sys.exit(1)
    
    command = sys.argv[1]
    encoder = get_encoder()
    
    try:
        if command == "encode":
            texts = sys.argv[2:]
            if not texts:
                print("Error: No texts provided")
                sys.exit(1)
            
            embeddings = encoder.encode(texts)
            print(json.dumps(embeddings.tolist()))
        
        elif command == "similarity":
            if len(sys.argv) != 4:
                print("Error: Similarity requires exactly 2 texts")
                sys.exit(1)
            
            text1, text2 = sys.argv[2], sys.argv[3]
            similarity = encoder.similarity(text1, text2)
            print(json.dumps({"similarity": similarity}))
        
        elif command == "find_similar":
            if len(sys.argv) < 4:
                print("Error: find_similar requires query and at least one candidate")
                sys.exit(1)
            
            query = sys.argv[2]
            candidates = sys.argv[3:]
            results = encoder.find_similar(query, candidates)
            print(json.dumps(results))
        
        elif command == "info":
            info = encoder.get_model_info()
            print(json.dumps(info, indent=2))
        
        else:
            print(f"Error: Unknown command '{command}'")
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Error executing command: {e}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()