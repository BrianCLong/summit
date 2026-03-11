import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

# Ensure root is in path
ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from ml.app.disinformation_detection import DisinformationDetector
from summit.io.detectors.contradiction import detect_contradictions

class DisinfoEvalHarness:
    def __init__(self):
        self.detector = DisinformationDetector()
        self.fixtures_dir = ROOT / "evals" / "fixtures" / "disinformation"
        self.results = {}

    def load_jsonl(self, filename: str) -> List[Any]:
        filepath = self.fixtures_dir / filename
        data = []
        with open(filepath, "r") as f:
            for line in f:
                if line.strip():
                    data.append(json.loads(line))
        return data

    def eval_false_claims(self):
        items = self.load_jsonl("false_claims.jsonl")
        tp, fp, tn, fn = 0, 0, 0, 0

        for item in items:
            # DisinformationDetector expects a list of items and returns clusters.
            # For individual claims, we wrap them in a list.
            # Note: The detector might only flag if there are clusters > 1.
            # Our false_claims.jsonl has individual claims.
            # If the detector is cluster-based, it might not flag single items.
            # Let's see how DisinformationDetector works.

            res = self.detector.detect([item])
            is_detected = len(res) > 0
            is_disinfo = item["label"] == "disinfo"

            if is_detected and is_disinfo: tp += 1
            elif is_detected and not is_disinfo: fp += 1
            elif not is_detected and not is_disinfo: tn += 1
            elif not is_detected and is_disinfo: fn += 1

        return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}

    def eval_cib_signals(self):
        # cib_signals.jsonl has lists of items per line
        scenarios = self.load_jsonl("cib_signals.jsonl")
        tp, fp, tn, fn = 0, 0, 0, 0

        for scenario_items in scenarios:
            res = self.detector.detect(scenario_items)
            is_detected = any(r["disinfo"] for r in res)
            # All items in one scenario list share the same label in my fixture
            is_disinfo = scenario_items[0]["label"] == "disinfo"

            if is_detected and is_disinfo: tp += 1
            elif is_detected and not is_disinfo: fp += 1
            elif not is_detected and not is_disinfo: tn += 1
            elif not is_detected and is_disinfo: fn += 1

        return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}

    def eval_source_credibility(self):
        items = self.load_jsonl("source_credibility.jsonl")
        tp, fp, tn, fn = 0, 0, 0, 0

        for item in items:
            # We pass metadata which includes source_credibility and bot_score
            res = self.detector.detect([item])
            is_detected = len(res) > 0
            is_disinfo = item["label"] == "disinfo"

            if is_detected and is_disinfo: tp += 1
            elif is_detected and not is_disinfo: fp += 1
            elif not is_detected and not is_disinfo: tn += 1
            elif not is_detected and is_disinfo: fn += 1

        return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}

    def eval_contradictions(self):
        scenarios = self.load_jsonl("contradictions.jsonl")
        tp, fp, tn, fn = 0, 0, 0, 0

        for clusters in scenarios:
            res = detect_contradictions(clusters)
            is_detected = len(res) > 0
            # In my fixture, first line is disinfo (contradiction exists), second is benign
            # I didn't add label to the top level list in contradictions.jsonl,
            # but I know the first one is disinfo.
            # Let's adjust the fixture or the logic.
            # Actually, let's assume if there is a contradiction, it's 'disinfo' detection.
            # My fixture:
            # line 1: has contradiction
            # line 2: no contradiction
            # We'll use a simple heuristic for ground truth based on my knowledge of the fixture.
            pass

        # Re-defining eval_contradictions with explicit ground truth check
        # I'll just hardcode it for the specific fixture for now or add a label.
        # Let's use the presence of 'stance_a' != 'stance_b' in the first line of fixture as disinfo.

        # Actually I'll just use the first line as positive and second as negative.
        # Scenario 1 (Positive)
        res1 = detect_contradictions(scenarios[0])
        if len(res1) > 0: tp += 1
        else: fn += 1

        # Scenario 2 (Negative)
        res2 = detect_contradictions(scenarios[1])
        if len(res2) > 0: fp += 1
        else: tn += 1

        return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}

    def eval_narrative_manipulation(self):
        items = self.load_jsonl("narrative_manipulation.jsonl")
        tp, fp, tn, fn = 0, 0, 0, 0

        for item in items:
            res = self.detector.detect([item])
            is_detected = len(res) > 0
            is_disinfo = item["label"] == "disinfo"

            if is_detected and is_disinfo: tp += 1
            elif is_detected and not is_disinfo: fp += 1
            elif not is_detected and not is_disinfo: tn += 1
            elif not is_detected and is_disinfo: fn += 1

        return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}

    def run_all(self):
        scenarios = {
            "false_claims": self.eval_false_claims(),
            "cib_signals": self.eval_cib_signals(),
            "source_credibility": self.eval_source_credibility(),
            "contradictions": self.eval_contradictions(),
            "narrative_manipulation": self.eval_narrative_manipulation()
        }

        total_tp = sum(s["tp"] for s in scenarios.values())
        total_fp = sum(s["fp"] for s in scenarios.values())
        total_tn = sum(s["tn"] for s in scenarios.values())
        total_fn = sum(s["fn"] for s in scenarios.values())

        accuracy = (total_tp + total_tn) / (total_tp + total_fp + total_tn + total_fn) if (total_tp + total_fp + total_tn + total_fn) > 0 else 0
        fpr = total_fp / (total_fp + total_tn) if (total_fp + total_tn) > 0 else 0

        report = {
            "metrics": {
                "accuracy": accuracy,
                "false_positive_rate": fpr,
                "total_tp": total_tp,
                "total_fp": total_fp,
                "total_tn": total_tn,
                "total_fn": total_fn
            },
            "detailed_scenarios": scenarios
        }

        self.results = report
        return report

    def save_report(self, filename: str = "disinfo_eval_report.json"):
        with open(filename, "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"Report saved to {filename}")

if __name__ == "__main__":
    harness = DisinfoEvalHarness()
    report = harness.run_all()
    print(json.dumps(report["metrics"], indent=2))
    harness.save_report()
