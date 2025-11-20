"""
Pipeline to load curated demo data for De-escalation Coaching demo.

This script:
1. Loads demo conversations from JSONL
2. Analyzes toxicity, sentiment, emotion
3. Generates rewrite suggestions
4. Prepares copilot guidance context
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import requests

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))


class DemoConversationLoader:
    """Loads and processes demo conversations for de-escalation coaching."""

    def __init__(self, data_path: Path, output_path: Path, api_url: str = None):
        self.data_path = data_path
        self.output_path = output_path
        self.output_path.mkdir(parents=True, exist_ok=True)

        # Try to connect to de-escalation coach API if available
        self.api_url = api_url or "http://localhost:8000"
        self.api_available = self._check_api()

    def _check_api(self) -> bool:
        """Check if de-escalation coach API is available."""
        try:
            response = requests.get(f"{self.api_url}/healthz", timeout=2)
            return response.status_code == 200
        except:
            return False

    def load_conversations(self) -> List[Dict[str, Any]]:
        """Load demo conversations from JSONL file."""
        conversations = []
        with open(self.data_path / "demo-conversations.jsonl", "r") as f:
            for line in f:
                if line.strip():
                    conversations.append(json.loads(line))
        print(f"✓ Loaded {len(conversations)} demo conversations")
        return conversations

    def analyze_conversation(self, conv: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a single conversation.

        Returns enriched conversation with analysis results.
        """
        result = {
            "conversation": conv,
            "analysis": {
                "timestamp": datetime.utcnow().isoformat(),
                "diagnostic": {},
                "rewrite": {},
                "guidance": [],
                "escalation_risk": conv["ground_truth"]["escalation_risk"]
            }
        }

        if self.api_available:
            # Use real API
            try:
                response = requests.post(
                    f"{self.api_url}/analyze",
                    json={"text": conv["customer_message"]},
                    timeout=10
                )

                if response.status_code == 200:
                    api_result = response.json()
                    result["analysis"]["diagnostic"] = api_result["diagnostic"]
                    result["analysis"]["rewrite"] = api_result["rewrite"]
                    result["analysis"]["guidance"] = api_result["guidance"]
                    result["analysis"]["policy_flags"] = api_result.get("policy_flags", [])
                else:
                    # Fall back to mock
                    result["analysis"] = self._mock_analysis(conv)
            except Exception as e:
                print(f"  ⚠️  API call failed: {e}, using mock data")
                result["analysis"] = self._mock_analysis(conv)
        else:
            # Use mock analysis based on ground truth
            result["analysis"] = self._mock_analysis(conv)

        return result

    def _mock_analysis(self, conv: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mock analysis based on ground truth."""
        gt = conv["ground_truth"]

        # Diagnostic
        diagnostic = {
            "toxicity": gt["toxicity"],
            "sentiment": gt["sentiment"],
            "emotion": gt["emotion"],
            "absolutist_score": gt["absolutist_score"],
            "caps_ratio": self._calculate_caps_ratio(conv["customer_message"])
        }

        # Generate rewrite
        rewrite = self._generate_rewrite(conv["customer_message"], diagnostic)

        # Generate guidance
        guidance = self._generate_guidance(conv["scenario"], diagnostic, gt["recommended_approach"])

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "diagnostic": diagnostic,
            "rewrite": {
                "version": "v1",
                "text": rewrite
            },
            "guidance": guidance,
            "policy_flags": [],
            "escalation_risk": gt["escalation_risk"]
        }

    def _calculate_caps_ratio(self, text: str) -> float:
        """Calculate ratio of uppercase characters."""
        if not text:
            return 0.0
        letters = [c for c in text if c.isalpha()]
        if not letters:
            return 0.0
        caps = [c for c in letters if c.isupper()]
        return len(caps) / len(letters)

    def _generate_rewrite(self, text: str, diagnostic: Dict[str, Any]) -> str:
        """Generate a de-escalated version of the message."""
        # Simple rewrite logic for demo
        rewrite = text.lower()

        # Remove excessive punctuation
        rewrite = rewrite.replace("!!!", ".").replace("!!", ".").replace("???", "?")

        # Soften absolutist language
        rewrite = rewrite.replace("never", "haven't yet")
        rewrite = rewrite.replace("always", "often")
        rewrite = rewrite.replace("every time", "frequently")

        # Remove accusations
        rewrite = rewrite.replace("you're stealing", "there's been a billing issue")
        rewrite = rewrite.replace("you're crooks", "I'm frustrated with the service")
        rewrite = rewrite.replace("incompetent", "I'm having technical difficulties")

        # Capitalize properly
        rewrite = ". ".join(s.capitalize() for s in rewrite.split(". "))

        return rewrite

    def _generate_guidance(self, scenario: str, diagnostic: Dict[str, Any], approach: str) -> List[str]:
        """Generate coaching guidance for the agent."""
        guidance = []

        # Risk-based guidance
        toxicity = diagnostic["toxicity"]
        if toxicity > 0.7:
            guidance.append("⚠️ High toxicity detected. Remain calm and professional.")
            guidance.append("Acknowledge the customer's frustration explicitly.")
        elif toxicity > 0.4:
            guidance.append("Moderate frustration detected. Show empathy and understanding.")

        # Scenario-specific guidance
        scenario_guidance = {
            "billing_dispute": [
                "Review account history before responding",
                "Offer specific timeline for resolution",
                "Consider escalation to billing specialist"
            ],
            "service_outage": [
                "Acknowledge business impact",
                "Provide concrete ETA for restoration",
                "Offer service credits proactively"
            ],
            "subscription_cancellation": [
                "Verify cancellation status immediately",
                "If error occurred, apologize and fix",
                "Document for fraud prevention team"
            ],
            "shipping_delay": [
                "Express empathy for missed special occasion",
                "Expedite shipping at no charge",
                "Offer discount on future order"
            ],
            "refund_processing": [
                "Investigate refund status immediately",
                "Escalate to finance if delayed",
                "Provide proof of processing if available"
            ]
        }

        if scenario in scenario_guidance:
            guidance.extend(scenario_guidance[scenario])

        # Absolutist language warning
        if diagnostic["absolutist_score"] > 0.6:
            guidance.append("Customer using absolutist language - avoid matching tone.")

        return guidance

    def process_all(self) -> Dict[str, Any]:
        """Process all demo conversations and save results."""
        print("\n🗣️  Starting De-escalation Coaching Demo Pipeline")
        print("=" * 60)

        if self.api_available:
            print("✓ De-escalation Coach API is available")
        else:
            print("⚠️  Using mock analysis (API not available)")

        conversations = self.load_conversations()
        results = []

        risk_counts = {"none": 0, "low": 0, "medium": 0, "high": 0, "critical": 0}

        for i, conv in enumerate(conversations, 1):
            print(f"\nAnalyzing conversation {i}/{len(conversations)}: {conv['id']}")
            result = self.analyze_conversation(conv)
            results.append(result)

            risk = result["analysis"]["escalation_risk"]
            risk_counts[risk] = risk_counts.get(risk, 0) + 1

            toxicity = result["analysis"]["diagnostic"]["toxicity"]
            print(f"  Scenario: {conv['scenario']}")
            print(f"  Toxicity: {toxicity:.2f} | Risk: {risk}")

        # Save results
        output_file = self.output_path / "analysis_results.json"
        summary = {
            "demo_name": "De-escalation Coaching",
            "processed_at": datetime.utcnow().isoformat(),
            "total_conversations": len(conversations),
            "risk_distribution": risk_counts,
            "avg_toxicity": sum(r["analysis"]["diagnostic"]["toxicity"] for r in results) / len(results),
            "results": results
        }

        with open(output_file, "w") as f:
            json.dump(summary, f, indent=2)

        print(f"\n{'=' * 60}")
        print(f"✓ Analysis complete!")
        print(f"  Total conversations: {len(conversations)}")
        print(f"  Risk distribution:")
        for risk, count in risk_counts.items():
            print(f"    {risk}: {count}")
        print(f"  Average toxicity: {summary['avg_toxicity']:.2f}")
        print(f"\n📊 Results saved to: {output_file}")

        return summary


def main():
    """Main entry point for demo data loading."""
    base_path = Path(__file__).parent.parent
    data_path = base_path / "datasets"
    output_path = base_path / "output"

    loader = DemoConversationLoader(data_path, output_path)
    loader.process_all()


if __name__ == "__main__":
    main()
