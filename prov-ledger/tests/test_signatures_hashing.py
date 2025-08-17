from io import BytesIO
import sys
import pathlib
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from fixtures import client
from app.hashing import sha256_digest
from app.signatures import verify_signature


def test_hash_and_signature(client):
    data = b"hello"
    h, length = sha256_digest(BytesIO(data))
    assert len(h) == 64
    assert length == len(data)

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_pem = (
        key.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    signature = key.sign(data, padding.PKCS1v15(), hashes.SHA256())
    ok, fp = verify_signature(public_pem, data, signature)
    assert ok and fp
    ok2, _ = verify_signature(public_pem, b"bad", signature)
    assert not ok2
