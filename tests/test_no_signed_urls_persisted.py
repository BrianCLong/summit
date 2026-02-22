from connectors.github.copilot_metrics.redaction import strip_signed_urls


def test_strip_signed_urls_redacts_payload():
    payload = {"download_links": ["https://signed.example/a", "https://signed.example/b"]}
    redacted = strip_signed_urls(payload)

    assert redacted["download_links"] == [
        "<REDACTED_SIGNED_URL>",
        "<REDACTED_SIGNED_URL>",
    ]
    assert redacted["_redaction"] == {"download_links": "redacted"}


def test_strip_signed_urls_noop_when_missing():
    payload = {"status": "ok"}
    assert strip_signed_urls(payload) is payload
