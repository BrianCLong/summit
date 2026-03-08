import hashlib
import json
import os
import re
import time
from typing import Any, Dict, List, Tuple

import numpy as np

from .estimator import ShapIQEstimator
from .interactions import InteractionManager

# PII Redaction
PII_PATTERNS = [
    r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
    r'\b(?:\d[ -]*?){13,16}\b' # Credit Card
]

def redact_pii(text: str) -> str:
    for pattern in PII_PATTERNS:
        text = re.sub(pattern, "[REDACTED]", text)
    return text

def apply_feature_filter(features: dict[str, Any], allowed_features: list[str]) -> dict[str, Any]:
    # Deny by default
    filtered = {}
    for k, v in features.items():
        if k in allowed_features:
            # Only redact string features to prevent breaking numerical inputs
            if isinstance(v, str):
                filtered[k] = redact_pii(v)
            else:
                filtered[k] = v
    return filtered

class ShapIQPipeline:
    def __init__(self, model, allowed_features=None, max_order=2, seed=42):
        self.estimator = ShapIQEstimator(model, max_order=max_order, seed=seed)
        self.interactions = InteractionManager(max_order=max_order, seed=seed)
        self.allowed_features = allowed_features or []

    def run(self, instance: dict[str, Any], model_id: str, run_id: str) -> tuple[dict, dict, dict, np.ndarray]:
        start_time = time.time()

        # Security: Input sanitization + deny-by-default feature filter
        filtered_instance = apply_feature_filter(instance, self.allowed_features)

        # We need list of values for the estimator
        feature_values = list(filtered_instance.values())
        feature_keys = list(filtered_instance.keys())

        # 1. Compute attributions
        # For our mock estimator, we pass the feature values list
        attributions_list = self.estimator.explain(feature_values)

        # Map back to feature names
        attributions = {feature_keys[i]: attributions_list[f"feature_{i}"] for i in range(len(feature_keys))}

        # 2. Compute interaction matrix
        interaction_matrix = self.interactions.compute_interactions(feature_values)

        # 3. Create outputs
        report = {
            "version": "1.0.0",
            "model_id": redact_pii(model_id),
            "attributions": attributions
        }

        latency_ms = (time.time() - start_time) * 1000
        metrics = {
            "latency_ms": latency_ms,
            "memory_mb": 0.0, # dummy
            "interaction_density": float(np.count_nonzero(interaction_matrix)) / (len(feature_values) * len(feature_values)) if feature_values else 0.0
        }

        # Deterministic hashing
        model_hash = hashlib.sha256(model_id.encode()).hexdigest()
        # Sort dict for deterministic hashing
        data_string = json.dumps(filtered_instance, sort_keys=True)
        data_hash = hashlib.sha256(data_string.encode()).hexdigest()
        config_hash = hashlib.sha256(f"seed={self.estimator.seed},max_order={self.estimator.max_order}".encode()).hexdigest()

        stamp = {
            "evidence_id": f"EVID-XAI-SHAPIQ-{run_id}",
            "model_hash": model_hash,
            "data_hash": data_hash,
            "config_hash": config_hash
        }

        return report, metrics, stamp, interaction_matrix

    def save_artifacts(self, output_dir: str, report: dict, metrics: dict, stamp: dict, interaction_matrix: np.ndarray):
        os.makedirs(output_dir, exist_ok=True)

        with open(os.path.join(output_dir, "report.json"), "w") as f:
            json.dump(report, f, indent=2, sort_keys=True)

        with open(os.path.join(output_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f, indent=2, sort_keys=True)

        with open(os.path.join(output_dir, "stamp.json"), "w") as f:
            json.dump(stamp, f, indent=2, sort_keys=True)

        np.save(os.path.join(output_dir, "interaction_matrix.npy"), interaction_matrix)
