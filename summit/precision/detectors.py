import json
import os
import logging
from typing import List, Dict, Any, Optional

try:
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
except ImportError:
    torch = None
except ImportError:
    torch = None

logger = logging.getLogger(__name__)

class MismatchReport:
    def __init__(self, mismatch_score: float, details: Dict[str, Any]):
        self.mismatch_score = mismatch_score
        self.details = details

def compute_mismatch_metrics(train_vals: dict[str, Any], rollout_vals: dict[str, Any]) -> MismatchReport:
    train_logprobs = train_vals.get("logprobs")
    if train_logprobs is None:
        train_logprobs = train_vals.get("log_probs")

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name).to(self.device)

    def detect(self, text: str) -> float:
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True).to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
        scores = torch.nn.functional.softmax(outputs.logits, dim=1)
        return scores[0][1].item()  # Assuming binary classification, index 1 is "positive/detected"

    if torch is None:
        raise ImportError("torch is required for computing mismatch metrics involving tensors")

    delta = (train_logprobs - rollout_logprobs).abs()

    return MismatchReport(
        max_abs_logprob_delta=delta.max().item(),
        mean_abs_logprob_delta=delta.mean().item(),
        violations=0,
    )


def collapse_alarm(metrics: dict[str, Any]) -> bool:
    # Check for NaNs
    for v in metrics.values():
        if isinstance(v, float) and math.isnan(v):
            return True

    # Check heuristics
    if metrics.get("reward_mean", 0.0) < -10.0:
        return True

    if metrics.get("kl_divergence", 0.0) > 100.0:
        return True

    return False
