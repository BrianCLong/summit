def test_analyze(client):
    resp = client.post("/analyze", json={"text": "They are ALL BAD!"})
    assert resp.status_code == 200
    data = resp.json()
    assert "rewrite" in data and "diagnostic" in data and "guidance" in data


pytest_plugins = ["tests.fixtures"]


def test_rate_limit(client):
    for _ in range(3):
        resp = client.post("/analyze", json={"text": "test"})
    assert resp.status_code == 429
