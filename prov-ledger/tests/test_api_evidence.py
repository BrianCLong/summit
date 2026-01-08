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


def test_register_evidence_v1(client):
    resp = client.post(
        "/v1/evidence",
        json={
            "hash": "sha256:1234567890abcdef",
            "type": "document",
            "url": "http://example.com/doc.pdf",
            "metadata": {"title": "Test Doc"},
        },
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["kind"] == "document"
    assert data["url"] == "http://example.com/doc.pdf"
    assert data["title"] == "Test Doc"
    assert data["id"]
