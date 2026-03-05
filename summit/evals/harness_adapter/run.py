from __future__ import annotations

"""
Mock-only adapter scaffolding.
Later: wire to real agent runtime (Copilot SDK / Summit agent runner) while preserving:
  - scenario inputs
  - captured artifacts
  - scoring against acceptance criteria
"""
import json
from pathlib import Path


def main() -> int:
    # TODO: load scenarios + acceptance criteria, run mock generation, emit evidence.
    out = {
        "evidence_id": "EVD-AGENTSKILLS-SKILLSEC-001",
        "summary": "Mock harness run",
        "artifacts": [],
        "status": "noop",
        "mode": "mock"
    }

    # Also write metrics and stamp to satisfy full evidence bundle requirements
    metrics = {
        "evidence_id": "EVD-AGENTSKILLS-SKILLSEC-001",
        "metrics": {
            "score": 0.0,
            "tests_passed": 0
        }
    }

    stamp = {
        "created_at": "2024-01-01T00:00:00Z", # Placeholder, should be real time
        "git_commit": "0000000000000000000000000000000000000000" # Placeholder
    }

    # In a real run, we would use datetime.utcnow().isoformat() and git sha.
    # But for deterministic mock output (as requested in plan often), placeholders might be used.
    # However, strict validators usually check format.

    output_dir = Path("evidence/agent-skills")
    output_dir.mkdir(parents=True, exist_ok=True)

    (output_dir / "report.json").write_text(json.dumps(out, indent=2))
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (output_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
