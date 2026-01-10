import tempfile


def create_claim_with_evidence(client, url, license_terms=None, license_owner=None):
    claim = client.post(
        "/claims/extract",
        json={"text": "Jupiter is massive."},
        headers={"X-API-Key": "testkey"},
    ).json()[0]

    ev_payload = {
        "kind": "url",
        "url": url,
        "title": "Evidence Title",
        "license_terms": license_terms,
        "license_owner": license_owner,
    }

    resp = client.post(
        "/evidence/register",
        json=ev_payload,
        headers={"X-API-Key": "testkey"},
    )
    evid = resp.json()

    client.post(
        f"/claims/{claim['id']}/attach",
        json={"claim_id": claim["id"], "evidence_id": evid["id"]},
        headers={"X-API-Key": "testkey"},
    )
    return claim, evid


def test_bundle_build_and_verify(client):
    claim, evid = create_claim_with_evidence(client, "http://example.com")
    resp = client.post(
        "/bundles/export",
        json={"case_id": "case-test", "evidence_ids": [evid["id"]]},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 200

    # Save zip to temp file
    with tempfile.NamedTemporaryFile("wb", delete=False, suffix=".zip") as f:
        f.write(resp.content)
        path = f.name

    # Verify using the module function directly
    from pathlib import Path

    from app.verify_bundle import verify_bundle

    ok, reasons = verify_bundle(Path(path))
    assert ok, f"Verification failed: {reasons}"


def test_bundle_blocked_by_license(client):
    claim, evid = create_claim_with_evidence(client, "http://example.com/bad", "no-export", "alice")
    resp = client.post(
        "/bundles/export",
        json={"case_id": "case-blocked", "evidence_ids": [evid["id"]]},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 403
    detail = resp.json()["detail"]
    assert "alice" in detail and "no-export" in detail
