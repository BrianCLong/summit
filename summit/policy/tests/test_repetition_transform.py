from summit.policy.repetition_transform import reinforce_constraints

def test_reinforce_empty():
    assert reinforce_constraints("") == ""
    assert reinforce_constraints(None) is None

def test_reinforce_normal():
    prompt = "Do this task."
    result = reinforce_constraints(prompt)
    assert "[CONSTRAINT REMINDER BLOCK]" in result
    assert "Follow all above constraints strictly." in result
    assert result.startswith(prompt)

def test_reinforce_already_present():
    prompt = "Do this task.\n\n[CONSTRAINT REMINDER BLOCK]\nFollow all above constraints strictly."
    result = reinforce_constraints(prompt)
    # Should be identical
    assert result == prompt
