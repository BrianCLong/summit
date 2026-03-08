from .base import Engine, RunRequest, RunResult
from .evidence_helper import write_engine_evidence


class SignalEngine:
    name = "signal_engine"

    def run(self, req: RunRequest) -> RunResult:
        run_id = req.payload.get("run_id", "default")
        topic_seeds = req.payload.get("topic_seeds", [])

        opportunities = []
        for topic in topic_seeds:
            # Simulate signal discovery
            opportunities.append({
                "query_terms": [topic, f"{topic} automation", f"future of {topic}"],
                "sources": ["search_trends", "social_media_signals", "competitor_analysis"],
                "confidence": 0.85,
                "why_now": f"Increasing demand for {topic} in solo business workflows observed in early 2026.",
                "suggested_offer": f"{topic.capitalize()} Launch Accelerator"
            })

        summary = {
            "status": "Market signals processed",
            "topic_seeds": topic_seeds,
            "opportunities": opportunities
        }
        metrics = {
            "signals_count": len(opportunities),
            "top_confidence": max([o["confidence"] for o in opportunities]) if opportunities else 0
        }

        evidence_path = write_engine_evidence(self.name, run_id, summary, metrics)

        return RunResult(ok=True, evidence_path=evidence_path, summary=summary)
