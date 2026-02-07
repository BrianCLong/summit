import difflib

def compute_diff(solution_a, solution_b):
    diff = difflib.unified_diff(
        solution_a.splitlines(),
        solution_b.splitlines(),
        fromfile='solution_a',
        tofile='solution_b'
    )
    return "\n".join(diff)

def distill_lesson(lesson_id, source, diff_summary, effect, redactions=None):
    return {
        "lesson_id": lesson_id,
        "source": source,
        "diff_summary": diff_summary,
        "effect": effect,
        "redactions_applied": redactions or []
    }

class ReflectionEngine:
    def distill_lesson(self, evidence_id, solution_a, solution_b):
        diff = compute_diff(solution_a, solution_b)
        return distill_lesson(
            lesson_id=f"L-{evidence_id}",
            source="same_branch",
            diff_summary=diff,
            effect="positive"
        )
