import hashlib
from typing import BinaryIO, Tuple


def sha256_digest(stream: BinaryIO) -> Tuple[str, int]:
    h = hashlib.sha256()
    length = 0
    for chunk in iter(lambda: stream.read(8192), b""):
        h.update(chunk)
        length += len(chunk)
    return h.hexdigest(), length
