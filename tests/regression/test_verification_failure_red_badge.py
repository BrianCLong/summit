import json
import subprocess
from pathlib import Path


def test_verification_failure_red_badge(tmp_path: Path) -> None:
    summary_path = tmp_path / "summary.json"
    summary_path.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "commit": {"sha": "deadbeef", "repository": "org/repo"},
                "sbom": {"path": "sbom.json", "format": "spdx", "sha256": "abc"},
                "attestation": {"predicateType": "spdx", "status": "present", "bundlePath": "bundle.json"},
                "verification": {"status": "failed", "issuer": "issuer", "subject": "subject"},
            }
        )
    )

    badge_path = tmp_path / "badge.json"
    subprocess.run(
        [
            "python",
            "tools/evidence/derive_badge_payload.py",
            "--summary",
            str(summary_path),
            "--output",
            str(badge_path),
        ],
        check=True,
    )

    badge = json.loads(badge_path.read_text())
    assert badge["color"] == "red"
    assert badge["message"] == "failed"
