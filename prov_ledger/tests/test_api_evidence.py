def test_register_evidence(client):
    resp = client.post(
        "/evidence/register",
        json={"kind": "url", "url": "http://source.example"},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["hash"]
    assert data["id"]
