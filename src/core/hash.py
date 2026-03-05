from __future__ import annotations

from src.evidence.hashing import sha256_file, sha256_text


def run(args: dict) -> dict:
    url = args.get("url", "")
    file_path = args.get("file_path")
    file_hash = sha256_file(file_path)
    return {
        "url_sha256": sha256_text(url),
        "file_sha256": file_hash,
    }
