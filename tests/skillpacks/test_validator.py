from pathlib import Path
from summit.tools.summit_skills.validator import validate_skillpack

def test_rejects_additional_properties(tmp_path: Path):
  p = tmp_path / "skillpack.yaml"
  p.write_text("""\
id: verify-work
name: Verify Work
version: 0.1.0
owner: summit
enabled: true
permissions: {network: false, filesystem_write: false, allowed_tools: []}
inputs: []
outputs: []
forbidden_extra: true
""", encoding="utf-8")
  res = validate_skillpack(p)
  assert not res.ok
  assert any("additional properties" in i.message.lower() for i in res.issues)

def test_accepts_valid_skillpack(tmp_path: Path):
  p = tmp_path / "skillpack.yaml"
  p.write_text("""\
id: verify-work
name: Verify Work
version: 0.1.0
owner: summit
enabled: true
description: "End-of-session review for completeness, security, and hygiene."
triggers: ["session.end", "pr.before_merge"]
data_classification: internal
never_log_fields: ["secrets", "tokens"]
permissions:
  network: false
  filesystem_write: false
  allowed_tools: ["repo.read", "tests.run", "lint.run"]
inputs:
  - name: change_summary
    type: string
    required: true
outputs:
  - name: report
    type: evidence.report.json
  - name: metrics
    type: evidence.metrics.json
""", encoding="utf-8")
  res = validate_skillpack(p)
  assert res.ok
  assert len(res.issues) == 0

def test_rejects_invalid_id_pattern(tmp_path: Path):
  p = tmp_path / "skillpack.yaml"
  p.write_text("""\
id: INVALID_ID
name: Verify Work
version: 0.1.0
owner: summit
enabled: true
permissions: {network: false, filesystem_write: false, allowed_tools: []}
inputs: []
outputs: []
""", encoding="utf-8")
  res = validate_skillpack(p)
  assert not res.ok
  assert any("does not match" in i.message.lower() for i in res.issues)
