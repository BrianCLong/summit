from summit_rt.blackbox.output_validator import validate_steps

def test_citations_pass():
    text = """
    1. Click the 'Login' button (N123).
    2. Enter credentials found in (node:cred-1).
    """
    assert validate_steps(text) == []

def test_citations_fail():
    text = """
    1. Click the 'Login' button.
    2. Enter credentials.
    """
    violations = validate_steps(text)
    assert "step_1_missing_citation" in violations
    assert "step_2_missing_citation" in violations

def test_mixed_citations():
    text = """
    1. Start the server (E456).
    2. Check logs.
    """
    violations = validate_steps(text)
    assert "step_1_missing_citation" not in violations
    assert "step_2_missing_citation" in violations
