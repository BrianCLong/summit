import json
import hashlib

def generate_evidence(prompt: str, result: dict):
    """Generates deterministic evidence for prompt repetition evaluation."""
    prompt_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()

    report = {
        "prompt_sha": prompt_hash,
        "classification": result["class"],
        "score": result["score"]
    }
    metrics = {
        "prompt_sha": prompt_hash,
        "repetition_score": result["score"]
    }
    stamp = {
        "verified": True,
        "policy_version": "1.0"
    }
    return report, metrics, stamp
