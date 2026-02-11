from pathlib import Path


def parse_policy_terms(path: Path) -> tuple[list[str], list[str]]:
    deny_terms: list[str] = []
    allow_terms: list[str] = []
    section = None
    in_match = False
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("deny:"):
            section = "deny"
            in_match = False
            continue
        if stripped.startswith("allow:"):
            section = "allow"
            in_match = False
            continue
        if stripped.startswith("match:"):
            in_match = True
            continue
        if stripped.startswith("- "):
            value = stripped[2:].strip()
            if value.startswith("id:"):
                in_match = False
                continue
            if in_match and section == "deny":
                deny_terms.append(value)
            elif in_match and section == "allow":
                allow_terms.append(value)
    return deny_terms, allow_terms


def test_offensive_requests_denied() -> None:
    policy_path = Path("policy/defensive_only.yml")
    deny_terms, _ = parse_policy_terms(policy_path)
    fixture_path = Path("tests/fixtures/policy/offensive_requests.txt")
    prompts = [line.strip() for line in fixture_path.read_text().splitlines() if line.strip()]
    for prompt in prompts:
        prompt_lower = prompt.lower()
        assert any(term.lower() in prompt_lower for term in deny_terms)


def test_defensive_allow_examples() -> None:
    policy_path = Path("policy/defensive_only.yml")
    _, allow_terms = parse_policy_terms(policy_path)
    sample = "detect coordination anomalies"
    sample_lower = sample.lower()
    assert any(term.lower() in sample_lower for term in allow_terms)
