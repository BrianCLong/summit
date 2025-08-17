from app.diagnostics import analyze_text


def test_absolutist_and_caps():
    text = "EVERYONE ALWAYS HATES!!"
    diag = analyze_text(text)
    assert diag["absolutist_score"] > 0
    assert diag["caps_ratio"] > 0
    assert abs(sum(diag["sentiment"].values()) - 1) < 1e-6
    assert abs(sum(diag["emotion"].values()) - 1) < 1e-6
