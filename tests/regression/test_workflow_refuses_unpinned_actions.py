from pathlib import Path


def test_supplychain_workflow_actions_are_pinned() -> None:
    workflow_path = Path(".github/workflows/supplychain.yml")
    content = workflow_path.read_text(encoding="utf-8")
    violations = []
    for index, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if not stripped.startswith("uses:"):
            continue
        if "./" in stripped or ".github/" in stripped:
            continue
        if "@" not in stripped:
            continue
        ref = stripped.split("@", 1)[1].split(" ", 1)[0].strip()
        if not (len(ref) == 40 and all(c in "0123456789abcdef" for c in ref)):
            violations.append((index, stripped))
    assert not violations, f"Unpinned actions found: {violations}"
