import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional

class EvidenceWriter:
    """
    Deterministic evidence writer. Ensures stable JSON key ordering
    and enforces timestamp separation (only in stamp.json).
    """
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _write_json(self, filename: str, data: Dict[str, Any]):
        p = self.root_dir / filename
        content = json.dumps(data, sort_keys=True, indent=2)
        p.write_text(content + "\n", encoding="utf-8")

    def write(self, report: Dict[str, Any], metrics: Dict[str, Any], stamp: Optional[Dict[str, Any]] = None):
        """
        Writes report, metrics, and optionally stamp files.
        Updates index.json with references.
        """
        self._write_json("report.json", report)
        self._write_json("metrics.json", metrics)
        if stamp:
            self._write_json("stamp.json", stamp)

        # Update index
        index_path = self.root_dir / "index.json"
        index = {"items": {}}
        if index_path.exists():
            try:
                index = json.loads(index_path.read_text(encoding="utf-8"))
                if "items" not in index:
                    index["items"] = {}
            except:
                pass

        run_id = report.get("run_id", "unknown")
        evidence_id = f"EVD-CLAUDECODE-SUBAGENTS-{run_id}"

        def get_rel_path(fname):
            full_path = self.root_dir / fname
            try:
                return str(full_path.relative_to(Path.cwd()))
            except ValueError:
                # Fallback for tests or out-of-repo paths
                return str(full_path)

        files = [
            get_rel_path("report.json"),
            get_rel_path("metrics.json")
        ]
        if stamp:
             files.append(get_rel_path("stamp.json"))

        index["items"][evidence_id] = {"files": files}
        self._write_json("index.json", index)
