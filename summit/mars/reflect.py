import difflib
from .redact import redact_text

def compute_diff(solution_a, solution_b):
    # Redact before computing diff to ensure sensitive info isn't leaked in diff
    safe_a = redact_text(solution_a)
    safe_b = redact_text(solution_b)

    diff = difflib.unified_diff(
        safe_a.splitlines(),
        safe_b.splitlines(),
        fromfile='solution_a',
        tofile='solution_b',
        lineterm=''
    )
    return "\n".join(diff)

def distill_lesson(lesson_id, source, diff_summary, effect, redactions_applied=None):
    return {
        "lesson_id": lesson_id,
        "source": source,
        "diff_summary": diff_summary,
        "effect": effect,
        "redactions_applied": redactions_applied or []
    }

class ReflectionEngine:
    def distill_lesson(self, evidence_id, solution_a, solution_b):
        diff = compute_diff(solution_a, solution_b)

        # Determine effect (mock logic)
        effect = "positive" if "improved" in solution_b.lower() else "unknown"

        return distill_lesson(
            lesson_id=f"L-{evidence_id}",
            source="same_branch",
            diff_summary=diff,
            effect=effect,
            redactions_applied=["PII", "Secrets", "ScriptTags"] if "[REDACTED" in diff else []
        )
