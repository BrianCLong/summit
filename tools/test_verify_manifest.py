import io, json, zipfile, base64, hashlib
from nacl.signing import SigningKey
from nacl.encoding import RawEncoder
from subprocess import run, PIPE
import tempfile, os, sys

def sha256(b):
    import hashlib
    return hashlib.sha256(b).hexdigest()

def test_verify_ok(tmp_path):
    # Create temp keypair
    sk = SigningKey.generate()
    vk_b64 = base64.b64encode(sk.verify_key.encode(encoder=RawEncoder)).decode()

    # Create files
    files = {
        "case.json": b'{"hello":"world"}',
        "nodes.csv": b"id,source\nn1,TWITTER\n",
        "edges.csv": b"a,b,score\nn1,n2,3.14\n",
        "motifs.csv": b"tag,n\nfoo,10\n",
        "summary.md": b"# Summary\nOk\n",
        "report.pdf": b"%PDF-1.4\n",  # stub
    }
    checksums = {k: sha256(v) for k, v in files.items()}

    manifest_payload = {"case_id": "case-123", "checksums": checksums}
    payload_bytes = json.dumps(manifest_payload, sort_keys=True).encode()
    sig = sk.sign(payload_bytes).signature
    signed_manifest = {"manifest": manifest_payload, "signature": base64.b64encode(sig).decode()}

    # Build zip
    zpath = tmp_path / "bundle.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)
        z.writestr("manifest.json", json.dumps(signed_manifest, indent=2))

    # Run verifier
    p = run([sys.executable, "tools/verify_manifest.py", "--zip", str(zpath), "--pubkey-base64", vk_b64, "--json"], stdout=PIPE)
    assert p.returncode == 0, p.stdout.decode()
    j = json.loads(p.stdout.decode())
    assert j["ok"] is True
    assert j["signature_valid"] is True
    assert not j["missing_files"]
    assert not j["checksum_mismatches"]
