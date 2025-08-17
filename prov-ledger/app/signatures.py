import hashlib
from typing import Tuple

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature


def verify_signature(public_pem: str, data: bytes, signature: bytes) -> Tuple[bool, str]:
    key = serialization.load_pem_public_key(public_pem.encode())
    try:
        key.verify(signature, data, padding.PKCS1v15(), hashes.SHA256())
        signer_fp = hashlib.sha256(public_pem.encode()).hexdigest()
        return True, signer_fp
    except InvalidSignature:
        return False, ""
