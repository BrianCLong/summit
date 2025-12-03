"""
OSINT Data Loader for Federated Learning

Handles loading and preprocessing of OSINT data for local training.
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterator, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class OSINTSample:
    """A single OSINT data sample"""
    sample_id: str
    features: np.ndarray
    label: int
    source: str
    confidence: float
    metadata: Dict[str, Any]


class OSINTDataset:
    """Dataset of OSINT samples for federated training"""

    def __init__(self, samples: List[OSINTSample] = None):
        self.samples = samples or []

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> OSINTSample:
        return self.samples[idx]

    def add_sample(self, sample: OSINTSample) -> None:
        """Add a sample to the dataset"""
        self.samples.append(sample)

    def get_features_labels(self) -> Tuple[np.ndarray, np.ndarray]:
        """Get all features and labels as arrays"""
        if not self.samples:
            return np.array([]), np.array([])

        features = np.array([s.features for s in self.samples])
        labels = np.array([s.label for s in self.samples])
        return features, labels

    def split(self, ratio: float = 0.8) -> Tuple["OSINTDataset", "OSINTDataset"]:
        """Split dataset into train and test"""
        split_idx = int(len(self.samples) * ratio)
        indices = np.random.permutation(len(self.samples))

        train_samples = [self.samples[i] for i in indices[:split_idx]]
        test_samples = [self.samples[i] for i in indices[split_idx:]]

        return OSINTDataset(train_samples), OSINTDataset(test_samples)


class OSINTDataLoader:
    """Data loader for OSINT federated training"""

    def __init__(
        self,
        dataset: OSINTDataset,
        batch_size: int = 32,
        shuffle: bool = True,
    ):
        self.dataset = dataset
        self.batch_size = batch_size
        self.shuffle = shuffle

    def __iter__(self) -> Iterator[Tuple[np.ndarray, np.ndarray]]:
        """Iterate over batches"""
        indices = np.arange(len(self.dataset))
        if self.shuffle:
            np.random.shuffle(indices)

        for start_idx in range(0, len(indices), self.batch_size):
            batch_indices = indices[start_idx:start_idx + self.batch_size]
            batch_samples = [self.dataset[i] for i in batch_indices]

            features = np.array([s.features for s in batch_samples])
            labels = np.array([s.label for s in batch_samples])

            yield features, labels

    def __len__(self) -> int:
        """Number of batches"""
        return (len(self.dataset) + self.batch_size - 1) // self.batch_size

    @staticmethod
    def generate_synthetic_data(
        num_samples: int = 1000,
        num_classes: int = 10,
        feature_dim: int = 768,
    ) -> OSINTDataset:
        """Generate synthetic OSINT data for testing"""
        samples = []

        for i in range(num_samples):
            label = i % num_classes
            # Generate features clustered by class
            features = np.random.randn(feature_dim) * 0.5
            features[:10] += label  # Add class signal

            sample = OSINTSample(
                sample_id=f"sample_{i}",
                features=features,
                label=label,
                source="synthetic",
                confidence=np.random.uniform(0.7, 1.0),
                metadata={"synthetic": True},
            )
            samples.append(sample)

        logger.info(f"Generated {num_samples} synthetic OSINT samples")
        return OSINTDataset(samples)
