from pathlib import Path

from src.skills.security.static_scan import scan_skill_dir


def test_scan_bad_fixture():
    # Using the actual fixture I created
    root = Path("fixtures/skills/bad_script_exfil")
    findings = scan_skill_dir(root)
    assert len(findings) > 0
    assert any(f.severity == "critical" for f in findings)
    assert any("shadow" in f.pattern for f in findings)

def test_scan_good_fixture():
    root = Path("fixtures/skills/good_minimal")
    findings = scan_skill_dir(root)
    assert len(findings) == 0
