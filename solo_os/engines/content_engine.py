from .base import Engine, RunRequest, RunResult
from .evidence_helper import write_engine_evidence


class ContentEngine:
    name = "content_engine"

    def run(self, req: RunRequest) -> RunResult:
        run_id = req.payload.get("run_id", "default")
        topics = req.payload.get("topics", [])

        briefs = []
        experiment_registry = []

        for topic in topics:
            brief = {
                "topic": topic,
                "hooks": [f"Why {topic} is changing everything in 2026", f"The secret to {topic} for solo founders"],
                "outline": ["Introduction", "Problem", "Solution", "Next Steps"],
                "cta_variants": [f"Get my {topic} guide", f"Join the {topic} workshop"]
            }
            briefs.append(brief)

            # Simulate an experiment
            experiment_registry.append({
                "brief_topic": topic,
                "platform": "LinkedIn",
                "variant": "CTA 1",
                "status": "draft"
            })

        summary = {
            "status": "Content briefs generated",
            "briefs": briefs,
            "experiments": experiment_registry
        }
        metrics = {
            "briefs_count": len(briefs),
            "experiments_count": len(experiment_registry)
        }

        evidence_path = write_engine_evidence(self.name, run_id, summary, metrics)

        return RunResult(ok=True, evidence_path=evidence_path, summary=summary)
