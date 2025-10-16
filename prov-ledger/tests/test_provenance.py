def test_provenance_graph(client):
    claim = client.post(
        "/claims/extract",
        json={"text": "Mars was visited."},
        headers={"X-API-Key": "testkey"},
    ).json()[0]
    evid = client.post(
        "/evidence/register",
        json={"kind": "url", "url": "http://nasa.gov"},
        headers={"X-API-Key": "testkey"},
    ).json()
    client.post(
        f"/claims/{claim['id']}/attach",
        json={"claim_id": claim["id"], "evidence_id": evid["id"]},
        headers={"X-API-Key": "testkey"},
    )
    resp = client.get(f"/claims/{claim['id']}/ledger", headers={"X-API-Key": "testkey"})
    data = resp.json()
    node_ids = {n["id"] for n in data["nodes"]}
    assert claim["id"] in node_ids
    assert evid["id"] in node_ids
