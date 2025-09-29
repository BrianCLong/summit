import hashlib
from typing import BinaryIO


def sha256_digest(stream: BinaryIO) -> tuple[str, int]:
    h = hashlib.sha256()
    length = 0
    for chunk in iter(lambda: stream.read(8192), b""):
        h.update(chunk)
        length += len(chunk)
    return h.hexdigest(), length
