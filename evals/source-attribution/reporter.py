import json
import datetime
from pathlib import Path

class SourceAttributionReporter:
    def __init__(self):
        self.root = Path(__file__).resolve().parents[2]
        self.evidence_dir = self.root / "evidence"
        self.evidence_id = "EVD-ATTR-EVAL-001"
        self.item_slug = "source-attribution-eval"
        self.out_dir = self.evidence_dir / self.item_slug / self.evidence_id

    def generate_report(self, results, metrics_summary):
        self.out_dir.mkdir(parents=True, exist_ok=True)

        report = {
            "evidence_id": self.evidence_id,
            "item_slug": self.item_slug,
            "area": "source_attribution",
            "summary": f"Evaluation of source attribution capabilities using {len(results)} test cases.",
            "results": results,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        }

        metrics = {
            "evidence_id": self.evidence_id,
            "metrics": {
                "test_cases": len(results),
                "attribution_precision": metrics_summary["attribution_precision"],
                "source_verification_rate": metrics_summary["source_verification_rate"]
            }
        }

        stamp = {
            "evidence_id": self.evidence_id,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
            "harness_version": "1.0.0"
        }

        (self.out_dir / "report.json").write_text(json.dumps(report, indent=2))
        (self.out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
        (self.out_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

        print(f"Evidence files generated in {self.out_dir}")
        self._update_index()

    def _update_index(self):
        index_path = self.evidence_dir / "index.json"
        if not index_path.exists():
            index = {"version": "1.0", "mappings": {}}
        else:
            index = json.loads(index_path.read_text())

        # Support both 'items' list and 'mappings' dict structures found in the repo
        if "mappings" in index:
            index["mappings"][self.evidence_id] = {
                "report": f"{self.item_slug}/{self.evidence_id}/report.json",
                "metrics": f"{self.item_slug}/{self.evidence_id}/metrics.json",
                "stamp": f"{self.item_slug}/{self.evidence_id}/stamp.json",
                "files": ["report.json", "metrics.json", "stamp.json"]
            }

        if "items" in index:
            # Update items list if it exists
            index["items"] = [item for item in index["items"] if item.get("id") != self.evidence_id]
            index["items"].append({
                "id": self.evidence_id,
                "path": f"{self.item_slug}/{self.evidence_id}/report.json"
            })

        index_path.write_text(json.dumps(index, indent=2))
        print(f"Updated {index_path}")
