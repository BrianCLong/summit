def create_claim(client):
    resp = client.post(
        "/claims/extract",
        json={"text": "Earth is round."},
        headers={"X-API-Key": "testkey"},
    )
    return resp.json()[0]


def register(client, url):
    return client.post(
        "/evidence/register",
        json={"kind": "url", "url": url},
        headers={"X-API-Key": "testkey"},
    ).json()


def attach(client, claim_id, evidence_id):
    client.post(
        f"/claims/{claim_id}/attach",
        json={"claim_id": claim_id, "evidence_id": evidence_id},
        headers={"X-API-Key": "testkey"},
    )


def test_scoring_independence(client):
    claim = create_claim(client)
    e1 = register(client, "http://a.com")
    e2 = register(client, "http://b.org")
    attach(client, claim["id"], e1["id"])
    attach(client, claim["id"], e2["id"])
    resp = client.get(f"/claims/{claim['id']}/corroboration", headers={"X-API-Key": "testkey"})
    data = resp.json()
    assert data["score"] > 0.7
    # now add duplicate domain
    e3 = register(client, "http://a.com/other")
    attach(client, claim["id"], e3["id"])
    resp2 = client.get(f"/claims/{claim['id']}/corroboration", headers={"X-API-Key": "testkey"})
    data2 = resp2.json()
    assert data2["breakdown"]["independence"] < 1
