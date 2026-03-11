import json
import re
import sys
from typing import List, Dict, Any, Tuple

class ClaimExtractor:
    @staticmethod
    def extract_claims(answer: str) -> List[str]:
        """
        Extracts factual claims from an answer.
        For simplicity, this splits by periods.
        """
        # Split by periods, strip whitespace, remove empty strings
        claims = [claim.strip() for claim in re.split(r'\.\s*', answer)]
        return [c for c in claims if c]


class ClaimMatcher:
    def __init__(self, graph: Dict[str, Any]):
        self.graph = graph
        self.nodes = graph.get("nodes", [])
        self.edges = graph.get("edges", [])

    def _extract_entities(self, claim: str) -> List[str]:
        """
        Simple heuristic: look for node names and types in the claim.
        In a real scenario, this would use NER or a larger dictionary.
        """
        entities = []
        claim_lower = claim.lower()

        # Look for explicit node names
        for node in self.nodes:
            name = node.get("name", "").lower()
            if name and name in claim_lower:
                entities.append(name)

        # Look for implicit entity terms if no exact names matched
        # (Very basic fallback for our synthetic cases)
        if not entities:
             words = claim_lower.split()
             for w in words:
                 if w in ["service", "database", "queue", "user", "cache"]:
                     entities.append(w)

        return list(set(entities))

    def _check_contradiction(self, claim: str, matched_nodes: List[Dict]) -> List[str]:
        """
        Check if the claim contradicts information in the matched nodes.
        For example, wrong environment.
        """
        contradicting_ids = []
        claim_lower = claim.lower()

        for node in matched_nodes:
            env = node.get("environment", "").lower()
            if env:
                # If the claim mentions an environment that is not the node's environment
                environments = ["prod", "staging", "dev", "shared"]
                for e in environments:
                    if e in claim_lower and e != env:
                        contradicting_ids.append(node["id"])
                        break
        return list(set(contradicting_ids))

    def match_claim(self, claim: str) -> Dict[str, Any]:
        """
        Matches a claim against the graph and returns grounding info.
        """
        supporting_nodes = []
        contradicting_nodes = []
        fabricated_entities = []

        claim_lower = claim.lower()

        # 1. Identify potential entities in the claim
        # A simple approach: we check if any known node names are in the claim.
        matched_node_objs = []
        for node in self.nodes:
            if node.get("name", "").lower() in claim_lower:
                matched_node_objs.append(node)
                supporting_nodes.append(node["id"])

        # 2. Check for relationships if multiple nodes matched
        # If we matched multiple nodes, see if there's an edge between them
        if len(matched_node_objs) >= 2:
            # We assume it's grounded if we found the nodes
            # A more robust check would verify the edge type (e.g., depends_on) matches the claim verb
            pass

        # 3. Check for contradictions
        if matched_node_objs:
             contradicting = self._check_contradiction(claim, matched_node_objs)
             contradicting_nodes.extend(contradicting)
             # If a node contradicts, it's not supporting
             supporting_nodes = [n for n in supporting_nodes if n not in contradicting_nodes]

        # 4. Check for fabrications
        # If we didn't match any known nodes, but the claim looks like it refers to entities
        # e.g., "cache database" is not in the graph nodes with name "cache database"
        if not matched_node_objs:
             # Basic heuristic: if it mentions 'service', 'database', etc. and wasn't matched
             entity_keywords = ["service", "database", "queue", "environment", "prod", "staging", "dev"]
             words = claim_lower.split()
             if any(k in words for k in entity_keywords):
                 # Try to extract a noun phrase. For our synthetic test, we'll just flag the whole claim or a key phrase.
                 # Let's extract the phrase before 'service' or 'database'
                 for kw in ["service", "database"]:
                     if kw in claim_lower:
                         idx = claim_lower.find(kw)
                         # Extract some words before it
                         start = max(0, claim_lower.rfind(" ", 0, idx - 1))
                         fabricated = claim_lower[start:idx + len(kw)].strip()
                         fabricated = fabricated.replace("the ", "")
                         fabricated_entities.append(fabricated)
                         break

                 if not fabricated_entities:
                     # Fallback fabrication string
                     fabricated_entities.append("unknown entity")

        is_grounded = len(supporting_nodes) > 0 and len(contradicting_nodes) == 0 and len(fabricated_entities) == 0

        return {
            "claim": claim,
            "is_grounded": is_grounded,
            "supporting_nodes": supporting_nodes,
            "contradicting_nodes": contradicting_nodes,
            "fabricated_entities": fabricated_entities
        }


def main(input_file: str, output_file: str):
    """
    Main execution logic for the Answer Grounding evaluation harness.
    Reads a fixture, extracts claims, matches them to the graph,
    calculates grounding rate, and writes a report.
    """
    with open(input_file, 'r') as f:
        data = json.load(f)

    test_cases = data.get("test_cases", [])
    report_results = []

    total_claims = 0
    total_grounded_claims = 0

    for case in test_cases:
        case_id = case.get("id")
        answer = case.get("answer")
        graph = case.get("graph", {})

        claims = ClaimExtractor.extract_claims(answer)
        matcher = ClaimMatcher(graph)

        case_claims_report = []
        for claim in claims:
            match_result = matcher.match_claim(claim)
            case_claims_report.append(match_result)

            total_claims += 1
            if match_result["is_grounded"]:
                total_grounded_claims += 1

        case_grounding_rate = sum(1 for c in case_claims_report if c["is_grounded"]) / len(claims) if claims else 0

        report_results.append({
            "case_id": case_id,
            "answer": answer,
            "claims": case_claims_report,
            "case_grounding_rate": round(case_grounding_rate, 4)
        })

    overall_grounding_rate = total_grounded_claims / total_claims if total_claims > 0 else 0

    report = {
        "evaluation": "answer-grounding",
        "total_cases": len(test_cases),
        "total_claims": total_claims,
        "total_grounded_claims": total_grounded_claims,
        "overall_grounding_rate": round(overall_grounding_rate, 4),
        "results": report_results
    }

    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"Evaluation complete. Report generated at {output_file}.")
    print(f"Overall Grounding Rate: {overall_grounding_rate:.2%}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python harness.py <input_fixture.json> <output_report.json>")
        sys.exit(1)

    input_fixture = sys.argv[1]
    output_report = sys.argv[2]
    main(input_fixture, output_report)
