import re
from datetime import datetime

class TemporalEvaluator:
    def __init__(self):
        pass

    def evaluate(self, fixture):
        metadata = fixture.get("metadata", {})
        eval_type = metadata.get("type")

        if eval_type == "accuracy":
            return self._evaluate_accuracy(fixture)
        elif eval_type == "historical_vs_current":
            return self._evaluate_historical(fixture)
        elif eval_type == "temporal_ordering":
            return self._evaluate_ordering(fixture)
        elif eval_type == "recency_bias":
            return self._evaluate_recency_bias(fixture)
        elif eval_type == "relative_time":
            return self._evaluate_relative_time(fixture)
        elif eval_type == "stale_source":
            return self._evaluate_stale_source(fixture)
        else:
            return {"score": 0.0, "reason": f"Unknown eval type: {eval_type}"}

    def _evaluate_accuracy(self, fixture):
        expected_date = fixture["metadata"]["expected_date"]
        answer = fixture["answer"]
        if expected_date in answer:
            return {"score": 1.0, "reason": "Date found in answer"}
        return {"score": 0.0, "reason": f"Expected date {expected_date} not found"}

    def _evaluate_historical(self, fixture):
        expected_state = fixture["metadata"]["expected_state"]
        answer = fixture["answer"].lower()
        if expected_state.lower() in answer:
             # In our fixture, we expect it to be down, but the answer says operational.
             # So we check if the answer correctly reflects the state in the sources.
             # If the answer is 'operational' but the source says 'down', it should fail.
             # Wait, the fixture answer is 'Yes, it is operational as of now.'
             # The source says 'System is down for maintenance.'
             # So if expected_state ('down') is NOT in the answer, it's a failure.
             return {"score": 1.0, "reason": f"Correct state '{expected_state}' reflected"}
        return {"score": 0.0, "reason": f"Correct state '{expected_state}' not reflected"}

    def _evaluate_ordering(self, fixture):
        expected_order = fixture["metadata"]["expected_order"]
        answer = fixture["answer"]

        # Check if events appear in the correct order in the answer string
        indices = [answer.find(event) for event in expected_order]
        if -1 in indices:
            return {"score": 0.0, "reason": "Not all events found in answer"}

        if indices == sorted(indices):
            return {"score": 1.0, "reason": "Events found in correct order"}
        return {"score": 0.0, "reason": "Events found in incorrect order"}

    def _evaluate_recency_bias(self, fixture):
        expected_policy = fixture["metadata"]["expected_policy"]
        answer = fixture["answer"]
        if expected_policy in answer:
            return {"score": 1.0, "reason": "Correct policy (authoritative) used", "is_recency_bias": False}
        return {"score": 0.0, "reason": "Incorrect policy used (likely recency bias)", "is_recency_bias": True}

    def _evaluate_relative_time(self, fixture):
        expected_year = str(fixture["metadata"]["expected_year"])
        answer = fixture["answer"]
        if expected_year in answer:
            return {"score": 1.0, "reason": "Correct year for relative reference found"}
        return {"score": 0.0, "reason": f"Expected year {expected_year} for relative reference not found"}

    def _evaluate_stale_source(self, fixture):
        # This check would normally look for a disclaimer in the answer
        # For now, let's assume it should mention the date or a warning
        answer = fixture["answer"].lower()
        # In our fixture, it just says 'The server is active.'
        # If it doesn't mention it might be stale, score is 0.
        if "stale" in answer or "as of" in answer or "2021" in answer:
            return {"score": 1.0, "reason": "Stale source warning or date present"}
        return {"score": 0.0, "reason": "No stale source warning or date present", "is_stale_ignored": True}
