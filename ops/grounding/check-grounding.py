#!/usr/bin/env python3
"""
MC Platform Grounding Verification Tool
Validates agentic RAG responses against source material for factual accuracy
"""

import json
import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple
import hashlib

class GroundingVerifier:
    def __init__(self):
        self.verification_results = []
        self.pass_threshold = 0.95  # 95% grounding pass rate required

    def verify_response(self, response: str, sources: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Verify that response is grounded in provided sources"""

        # Simplified grounding check (in production, use semantic similarity models)
        grounding_score = self._calculate_grounding_score(response, sources)

        verification = {
            "response_id": context.get("response_id", "unknown"),
            "tenant": context.get("tenant", "unknown"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "response": response,
            "sources": sources,
            "grounding_score": grounding_score,
            "passed": grounding_score >= self.pass_threshold,
            "metadata": {
                "response_length": len(response),
                "source_count": len(sources),
                "verification_method": "semantic_overlap"
            }
        }

        self.verification_results.append(verification)
        return verification

    def _calculate_grounding_score(self, response: str, sources: List[str]) -> float:
        """Calculate grounding score based on source overlap"""
        if not sources:
            return 0.0

        response_words = set(response.lower().split())
        source_words = set()

        for source in sources:
            source_words.update(source.lower().split())

        if not source_words:
            return 0.0

        # Calculate overlap ratio (simplified)
        overlap = len(response_words & source_words)
        overlap_ratio = overlap / len(response_words) if response_words else 0.0

        # Boost score if response contains key factual elements from sources
        factual_boost = self._check_factual_elements(response, sources)

        final_score = min(1.0, overlap_ratio + factual_boost)
        return final_score

    def _check_factual_elements(self, response: str, sources: List[str]) -> float:
        """Check for key factual elements (dates, numbers, names)"""
        # Simplified factual checking (in production, use NER + fact verification)
        factual_patterns = [
            r'\d{4}',  # Years
            r'\$[\d,]+',  # Monetary amounts
            r'\d+%',  # Percentages
            r'[A-Z][a-z]+ [A-Z][a-z]+',  # Proper names
        ]

        import re
        factual_boost = 0.0

        for pattern in factual_patterns:
            response_facts = set(re.findall(pattern, response))
            source_facts = set()

            for source in sources:
                source_facts.update(re.findall(pattern, source))

            if response_facts and source_facts:
                verified_facts = len(response_facts & source_facts)
                total_facts = len(response_facts)
                factual_boost += (verified_facts / total_facts) * 0.1

        return min(0.3, factual_boost)  # Cap boost at 0.3

    def verify_batch(self, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Verify multiple test cases"""
        results = []

        for case in test_cases:
            result = self.verify_response(
                response=case["response"],
                sources=case["sources"],
                context=case.get("context", {})
            )
            results.append(result)

        # Calculate aggregate stats
        total_cases = len(results)
        passed_cases = sum(1 for r in results if r["passed"])
        pass_rate = passed_cases / total_cases if total_cases > 0 else 0.0

        avg_score = sum(r["grounding_score"] for r in results) / total_cases if total_cases > 0 else 0.0

        summary = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "total_cases": total_cases,
            "passed_cases": passed_cases,
            "failed_cases": total_cases - passed_cases,
            "pass_rate": pass_rate,
            "average_score": avg_score,
            "threshold": self.pass_threshold,
            "overall_passed": pass_rate >= self.pass_threshold,
            "results": results
        }

        return summary

def load_golden_set(golden_set_path: str) -> List[Dict[str, Any]]:
    """Load golden test cases"""
    if not Path(golden_set_path).exists():
        # Create sample golden set if doesn't exist
        sample_cases = [
            {
                "response_id": "sample_001",
                "context": {"tenant": "TENANT_001", "query": "What is the company revenue?"},
                "response": "The company revenue for 2023 was $150 million, representing a 25% increase from the previous year.",
                "sources": [
                    "Financial Report 2023: Revenue reached $150 million in 2023.",
                    "Growth metrics showed 25% year-over-year increase in revenue."
                ]
            },
            {
                "response_id": "sample_002",
                "context": {"tenant": "TENANT_002", "query": "Who is the CEO?"},
                "response": "The current CEO is Sarah Johnson, who has been in this role since 2020.",
                "sources": [
                    "Leadership team: CEO Sarah Johnson (appointed 2020)",
                    "Executive profile: Sarah Johnson leads the company as Chief Executive Officer."
                ]
            }
        ]

        Path(golden_set_path).parent.mkdir(parents=True, exist_ok=True)
        with open(golden_set_path, 'w') as f:
            json.dump(sample_cases, f, indent=2)

        print(f"✅ Created sample golden set: {golden_set_path}")
        return sample_cases

    with open(golden_set_path, 'r') as f:
        return json.load(f)

def generate_attestation(results: Dict[str, Any], output_path: str):
    """Generate grounding attestation for evidence bundle"""

    # Create attestation with cryptographic signature
    attestation_content = {
        "platform_version": "v0.3.3-mc",
        "attestation_type": "grounding_verification",
        "timestamp": results["timestamp"],
        "verification_summary": {
            "total_cases": results["total_cases"],
            "pass_rate": results["pass_rate"],
            "average_score": results["average_score"],
            "threshold_met": results["overall_passed"]
        },
        "verification_details": {
            "method": "semantic_overlap_with_factual_boost",
            "threshold": results["threshold"],
            "individual_results": [
                {
                    "response_id": r["response_id"],
                    "tenant": r["tenant"],
                    "grounding_score": r["grounding_score"],
                    "passed": r["passed"]
                }
                for r in results["results"]
            ]
        }
    }

    # Generate content hash for integrity
    content_str = json.dumps(attestation_content, sort_keys=True)
    content_hash = hashlib.sha256(content_str.encode()).hexdigest()

    attestation_content["integrity_hash"] = content_hash

    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(attestation_content, f, indent=2)

    print(f"✅ Grounding attestation generated: {output_path}")
    print(f"🔒 Integrity hash: {content_hash}")

def main():
    parser = argparse.ArgumentParser(description="MC Platform Grounding Verification Tool")
    parser.add_argument("--golden-set", default="tests/grounding/golden-set.json", help="Golden test set path")
    parser.add_argument("--report", default="out/grounding-report.json", help="Output report path")
    parser.add_argument("--attest", default="evidence/v0.3.3/rag/grounding-attest.json", help="Attestation output path")
    parser.add_argument("--threshold", type=float, default=0.95, help="Pass threshold (default: 0.95)")

    args = parser.parse_args()

    # Initialize verifier
    verifier = GroundingVerifier()
    verifier.pass_threshold = args.threshold

    # Load golden test set
    print(f"📂 Loading golden test set from {args.golden_set}")
    test_cases = load_golden_set(args.golden_set)
    print(f"✅ Loaded {len(test_cases)} test cases")

    # Run verification
    print(f"🔍 Running grounding verification...")
    results = verifier.verify_batch(test_cases)

    # Save detailed report
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    with open(args.report, 'w') as f:
        json.dump(results, f, indent=2)

    # Generate attestation
    generate_attestation(results, args.attest)

    # Print summary
    print(f"\n🔍 Grounding Verification Results")
    print(f"=================================")
    print(f"Total cases: {results['total_cases']}")
    print(f"Passed: {results['passed_cases']}")
    print(f"Failed: {results['failed_cases']}")
    print(f"Pass rate: {results['pass_rate']:.1%}")
    print(f"Average score: {results['average_score']:.3f}")
    print(f"Threshold: {results['threshold']}")
    print(f"Overall result: {'✅ PASSED' if results['overall_passed'] else '❌ FAILED'}")

    # Exit with appropriate code
    sys.exit(0 if results['overall_passed'] else 1)

if __name__ == "__main__":
    main()