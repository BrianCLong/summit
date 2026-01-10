import json
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .registry import registry


def run_eval(
    name: str,
    cases: list[dict[str, Any]],
    predict_fn: Callable[[dict[str, Any]], Any],
    metrics: list[str],
    out_path: Path,
) -> None:
    """
    Run evaluation on a set of cases and write results to JSONL.
    cases must contain 'id' or 'case_id', 'inputs', 'y_true'.
    """
    # Sort cases by id to ensure deterministic order if IDs are present
    sorted_cases = sorted(cases, key=lambda c: str(c.get("case_id", c.get("id", ""))))

    with open(out_path, "w", encoding="utf-8") as f:
        for case in sorted_cases:
            case_id = case.get("case_id", case.get("id", "unknown"))
            inputs = case.get("inputs", {})
            y_true = case.get("y_true")

            # Predict
            try:
                y_pred = predict_fn(inputs)
            except Exception:
                y_pred = None
                # Maybe log error?

            # Compute metrics
            metric_results = {}
            if y_pred is not None and y_true is not None:
                for m_name in metrics:
                    try:
                        metric = registry.get(m_name)
                        score = metric.compute(y_true, y_pred)
                        metric_results[m_name] = score
                    except Exception:
                        pass  # Ignore metric failures

            record = {
                "case_id": case_id,
                "inputs": inputs,
                "y_true": y_true,
                "y_pred": y_pred,
                "metric_results": metric_results,
                "timestamp": time.time(),
                "eval_name": name,
            }

            f.write(json.dumps(record, sort_keys=True) + "\n")
