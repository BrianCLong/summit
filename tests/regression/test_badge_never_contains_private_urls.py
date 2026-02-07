import json
import subprocess
from pathlib import Path


def test_badge_never_contains_private_urls(tmp_path: Path) -> None:
    source_dir = tmp_path / "source"
    source_dir.mkdir()

    badge_path = source_dir / "badge.json"
    summary_path = source_dir / "evidence.summary.json"

    badge_path.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "label": "sbom",
                "message": "verified",
                "color": "brightgreen",
            }
        )
    )

    summary_path.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "commit": {"sha": "deadbeef", "repository": "org/repo"},
                "sbom": {"path": "sbom.json", "format": "spdx", "sha256": "abc"},
                "attestation": {"predicateType": "spdx", "status": "present", "bundlePath": "bundle.json"},
                "verification": {"status": "verified", "issuer": "https://github.com/org/repo/actions", "subject": "subject"},
            }
        )
    )

    dest_dir = tmp_path / "public"
    process = subprocess.run(
        [
            "python",
            "tools/publish/public_evidence_publish.py",
            "--source-dir",
            str(source_dir),
            "--dest-dir",
            str(dest_dir),
            "--commit",
            "deadbeef",
        ],
        capture_output=True,
        text=True,
    )

    assert process.returncode != 0
