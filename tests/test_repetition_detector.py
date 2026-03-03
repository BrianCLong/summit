from summit.policies.repetition_detector import classify_repetition

def test_benign_repetition():
    result = classify_repetition("Just a normal prompt.")
    assert result["class"] == "none"

def test_beneficial_repetition():
    result = classify_repetition("Please help me. Please help me.")
    assert result["class"] == "beneficial"

def test_harmful_repetition():
    long_str = "This is a very long string that is repeated " * 10
    result = classify_repetition(long_str + ". " + long_str)
    assert result["class"] == "harmful"
