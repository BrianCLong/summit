from app.rewrite import rewrite_text


def test_rewrite_deescalates():
    text = "YOU ARE AN IDIOT!!!"
    rewritten, flags = rewrite_text(text)
    assert "idiot" not in rewritten
    assert "!" not in rewritten
    assert rewritten.islower() or rewritten[0].isupper()
    assert "content_drift" not in flags


def test_content_drift_flag():
    text = "There are 3 cats"
    rewritten, flags = rewrite_text(text)
    assert "content_drift" in flags
