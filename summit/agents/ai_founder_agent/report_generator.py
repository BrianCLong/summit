import json


def create_report(idea_text, problem, interviews, momentum_score):
    report = {
        "idea": idea_text,
        "problem": problem,
        "interviews": interviews,
        "momentum_score": momentum_score,
        "stamp": "TODO_HASH"  # deterministic hash of inputs
    }
    with open("report.json", "w") as f:
        json.dump(report, f, indent=2)
