from evals.agentic.pii_scrubber import scrub_obj

def test_scrub_email():
    assert "[REDACTED]" in scrub_obj({"x":"email a@b.com"})["x"]
    assert "[REDACTED]" in scrub_obj({"x":"test@example.com"})["x"]

def test_scrub_phone():
    assert "[REDACTED]" in scrub_obj({"x":"Call me at 123-456-7890"})["x"]
    assert "[REDACTED]" in scrub_obj({"x":"My number is (123) 456-7890"})["x"]

def test_scrub_token():
    assert "[REDACTED]" in scrub_obj({"x":"Authorization: Bearer mysecrettoken123"})["x"]
    assert "[REDACTED]" in scrub_obj({"x":"API_KEY=abcdefg12345"})["x"]

def test_scrub_ssn():
    assert "[REDACTED]" in scrub_obj({"x":"SSN: 123-45-6789"})["x"]

def test_scrub_ip4():
    assert "[REDACTED]" in scrub_obj({"x":"Connect to 192.168.1.1"})["x"]

def test_scrub_nested_dict_list():
    data = {
        "user": {"email": "user@example.com", "phone": "111-222-3333"},
        "logs": ["token=abc", "1.2.3.4"]
    }
    scrubbed_data = scrub_obj(data)
    assert "[REDACTED]" in scrubbed_data["user"]["email"]
    assert "[REDACTED]" in scrubbed_data["user"]["phone"]
    assert "[REDACTED]" in scrubbed_data["logs"][0]
    assert "[REDACTED]" in scrubbed_data["logs"][1]
