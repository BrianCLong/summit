import re
import json
from typing import List, Dict, Any

class HallucinationDetector:
    """
    Detects hallucinations in GraphRAG responses by comparing them against ground-truth evidence.
    """

    def __init__(self, ground_truth: Dict[str, Any]):
        """
        Initialize with ground truth data.
        ground_truth: mapping of evidence_id to evidence content.
        """
        self.ground_truth = ground_truth

    def extract_claims(self, text: str) -> List[str]:
        """
        Extract sentences that look like factual claims.
        """
        sentences = re.split(r'[.!?]+', text)
        claims = [s.strip() for s in sentences if len(s.strip()) > 20]
        return claims

    def extract_entities(self, text: str) -> List[str]:
        """
        Simple entity extraction based on capitalized words.
        In a real scenario, this would use a proper NER model.
        """
        # Exclude common stop words at start of sentences
        entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        return list(set(entities))

    def verify_claim(self, claim: str, expected_evidence_ids: List[str]) -> Dict[str, Any]:
        """
        Verify if a claim is supported by the expected evidence.
        """
        # Get all relevant evidence content
        evidence_content = ""
        for eid in expected_evidence_ids:
            if eid in self.ground_truth:
                evidence_content += self.ground_truth[eid].get("content", "") + " "

        # Simple keyword-based verification for this harness
        # In production, use semantic similarity or NLI
        claim_words = set(re.findall(r'\w+', claim.lower()))
        evidence_words = set(re.findall(r'\w+', evidence_content.lower()))

        # Stop words to filter out
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'by', 'of'}
        significant_words = [w for w in claim_words if w not in stop_words and len(w) > 3]

        if not significant_words:
            return {"supported": True, "score": 1.0}

        matches = [w for w in significant_words if w in evidence_words]
        score = len(matches) / len(significant_words)

        return {
            "supported": score > 0.3, # Threshold for support
            "score": score,
            "missing_keywords": [w for w in significant_words if w not in evidence_words]
        }

    def detect(self, response: str, task_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect hallucinations in a response given the task context.
        """
        expected_evidence_ids = task_context.get("expected_evidence", [])
        claims = self.extract_claims(response)

        unsupported_claims = []
        for claim in claims:
            verification = self.verify_claim(claim, expected_evidence_ids)
            if not verification["supported"]:
                unsupported_claims.append({
                    "claim": claim,
                    "reason": "No evidence found in ground truth",
                    "score": verification["score"]
                })

        # Entity Fabrication check
        # Get entities from ground truth evidence
        gt_entities = set()
        for eid in expected_evidence_ids:
            if eid in self.ground_truth:
                content = self.ground_truth[eid].get("content", "")
                gt_entities.update(self.extract_entities(content))

        response_entities = self.extract_entities(response)
        fabricated_entities = [e for e in response_entities if e not in gt_entities and len(e) > 3]

        hallucination_rate = (len(unsupported_claims) + len(fabricated_entities)) / max(1, len(claims))

        return {
            "hallucination_rate": min(1.0, hallucination_rate),
            "unsupported_claims": unsupported_claims,
            "fabricated_entities": fabricated_entities,
            "is_hallucinated": hallucination_rate > 0.1
        }
