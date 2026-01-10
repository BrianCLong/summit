import subprocess
from pathlib import Path


def run_redaction(tmp_path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            "python3",
            "scripts/compliance/redact_disclosure_pack.py",
            "--pack-dir",
            str(tmp_path),
        ],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
        check=False,
    )


def test_redacts_pii_and_secrets(tmp_path: Path) -> None:
    sample = tmp_path / "sample.txt"
    sample.write_text(
        "Contact: jane.doe@example.com\n"
        "SSN: 123-45-6789\n"
        "Token: ghp_1234567890abcdef1234567890abcdef1234\n"
        "Bearer abcdef1234567890\n",
        encoding="utf-8",
    )

    result = run_redaction(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    content = sample.read_text(encoding="utf-8")
    assert "jane.doe@example.com" not in content
    assert "123-45-6789" not in content
    assert "ghp_1234567890abcdef1234567890abcdef1234" not in content
    assert "Bearer abcdef1234567890" not in content
    assert "[REDACTED]" in content
