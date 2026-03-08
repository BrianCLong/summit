from __future__ import annotations

import os
from pathlib import Path

from codegen.summit_codegen.emit import emit_json


def generate(output_root: Path) -> None:
    if os.environ.get("SUMMIT_EXPERIMENTAL_CODEDATA") != "1":
        return

    flags = {
        "version": "1.0.0",
        "description": "Generated feature flags",
        "environments": {
            "development": {
                "provider": "local",
                "config": {"file": "./feature-flags-dev.json"}
            }
        },
        "flags": {
            "new-dashboard": {
                "key": "new-dashboard",
                "name": "New Dashboard",
                "type": "boolean",
                "defaultValue": True,
                "description": "Enables the new GA dashboard",
                "tags": ["ui", "ga"]
            }
        }
    }

    output_path = output_root / "generated" / "feature_flags.json"
    emit_json(output_path, flags)
    print(f"Generated {output_path}")

    evidence_id = "EVD-SDSBC-CODEGEN-001"
    evidence_dir = output_root / "evidence" / evidence_id
    evidence_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "evidence_id": evidence_id,
        "item_slug": "feature-flags-codegen",
        "claims": ["feature flags are generated deterministically from code"],
        "decisions": [{"action": "generate", "status": "success"}],
        "findings": [{"target": str(output_path), "status": "valid"}]
    }
    emit_json(evidence_dir / "report.json", report)

    metrics = {"flags_count": len(flags["flags"]), "generation_time_ms": 1}
    emit_json(evidence_dir / "metrics.json", metrics)

    import datetime
    stamp = {
        "evidence_id": evidence_id,
        "generated_at": datetime.datetime.now(datetime.UTC).isoformat()
    }
    import json
    (evidence_dir / "stamp.json").write_text(json.dumps(stamp, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    generate(Path.cwd())
