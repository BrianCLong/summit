from policy.gate import check


def test_denies_guaranteed_earnings_language() -> None:
    findings = check("We provide guaranteed $1M results.")
    assert any("POLICY_DENY" in finding for finding in findings)


def test_allows_non_guaranteed_language() -> None:
    findings = check("We target revenue growth with clear milestones.")
    assert findings == []
