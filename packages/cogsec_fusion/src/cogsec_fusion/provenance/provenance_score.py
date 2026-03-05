from typing import Dict, List, Any

class ProvenanceScorer:
    def __init__(self):
        pass

    def calculate_score(self, artifact: Dict[str, Any]) -> float:
        """
        Calculates a provenance score (0.0 - 1.0) based on metadata.
        """
        score = 0.0
        checks = []

        # Check for source
        if artifact.get("source"):
            score += 0.3
            checks.append("Source present")

        # Check for hash
        if artifact.get("hash"):
            score += 0.2
            checks.append("Hash present")

        # Check for retrieval method
        if artifact.get("retrieved_via") == "c2pa":
             score += 0.5
             checks.append("C2PA verified")
        elif artifact.get("retrieved_via") == "crawler":
             score += 0.1
             checks.append("Crawled")

        return min(score, 1.0)

    def generate_checklist(self, artifact_id: str) -> List[str]:
         return [
             "Verify source domain",
             "Check C2PA signature",
             "Cross-reference with trusted archives",
             "Analyze metadata for inconsistencies"
         ]
