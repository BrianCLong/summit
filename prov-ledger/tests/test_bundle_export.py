import shutil
import zipfile
from pathlib import Path

from app.verify_bundle import verify_bundle


def create_claim_with_evidence(client, url):
    claim = client.post(
        "/claims/extract",
        json={"text": "The sky is blue."},
        headers={"X-API-Key": "testkey"},
    ).json()[0]
    evid = client.post(
        "/evidence/register",
        json={"kind": "url", "url": url},
        headers={"X-API-Key": "testkey"},
    ).json()
    client.post(
        f"/claims/{claim['id']}/attach",
        json={"claim_id": claim["id"], "evidence_id": evid["id"]},
        headers={"X-API-Key": "testkey"},
    )
    return claim, evid


def _export_bundle(client, evidence_id: str, tmp_path: Path) -> Path:
    resp = client.post(
        "/bundles/export",
        json={"case_id": "case-123", "evidence_ids": [evidence_id]},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 200
    bundle_path = tmp_path / "bundle.zip"
    bundle_path.write_bytes(resp.content)
    return bundle_path


def test_bundle_happy_path(client, tmp_path):
    _, evid = create_claim_with_evidence(client, "http://example.com/a")
    bundle_path = _export_bundle(client, evid["id"], tmp_path)
    ok, reasons = verify_bundle(bundle_path)
    assert ok, reasons


def test_bundle_tamper_detection(client, tmp_path):
    _, evid = create_claim_with_evidence(client, "http://example.com/b")
    bundle_path = _export_bundle(client, evid["id"], tmp_path)

    with zipfile.ZipFile(bundle_path) as zf:
        zf.extractall(tmp_path / "extract")

    target = tmp_path / "extract" / "artifacts" / f"{evid['id']}.json"
    # Modify JSON content to ensure hash mismatch (whitespace is ignored by canonicalizer)
    import json

    data = json.loads(target.read_text())
    data["tampered"] = True
    target.write_text(json.dumps(data))

    tampered_zip = tmp_path / "tampered.zip"
    shutil.make_archive(str(tampered_zip.with_suffix("")), "zip", root_dir=tmp_path / "extract")

    ok, reasons = verify_bundle(tampered_zip)
    assert not ok
    assert any(reason.startswith("hash-mismatch") for reason in reasons)


def test_bundle_reorder_does_not_fail(client, tmp_path):
    _, evid = create_claim_with_evidence(client, "http://example.com/c")
    bundle_path = _export_bundle(client, evid["id"], tmp_path)

    with zipfile.ZipFile(bundle_path) as zf:
        names = zf.namelist()
        zf.extractall(tmp_path / "reorder")

    reordered_zip = tmp_path / "reordered.zip"
    with zipfile.ZipFile(reordered_zip, "w") as zf:
        for name in reversed(names):
            file_path = tmp_path / "reorder" / name
            zf.write(file_path, arcname=name)

    ok, reasons = verify_bundle(reordered_zip)
    assert ok, reasons
