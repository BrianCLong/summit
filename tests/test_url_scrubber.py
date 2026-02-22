from agentic_web_visibility.policy.url_scrubber import scrub_query


def test_scrub_clean():
    assert scrub_query("foo=bar") == "foo=bar"
    assert scrub_query("q=search") == "q=search"

def test_scrub_sensitive():
    assert scrub_query("token=123") == ""
    assert scrub_query("auth=xyz") == ""
    assert scrub_query("user_email=a@b.com") == ""

def test_scrub_empty():
    assert scrub_query("") == ""
    assert scrub_query(None) == ""
