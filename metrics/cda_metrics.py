import json


def calculate_validation_bias_score(approvals_without_dissent: int, total_decisions: int) -> float:
    if total_decisions == 0:
        return 0.0

    score = approvals_without_dissent / total_decisions

    output = {
        "ValidationBiasRisk": score
    }

    with open("metrics.json", "w") as f:
        json.dump(output, f, indent=2)

    return score
