import hashlib
import json
import pathlib
from collections.abc import Iterable
from datetime import datetime
from typing import Any

from .hashing import sha256_digest


def canonical_json_bytes(data: Any) -> bytes:
    """Serialize JSON deterministically for hashing."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode(
        "utf-8"
    )


def _hash_path(path: pathlib.Path) -> tuple[str, int]:
    if path.suffix == ".json":
        data = json.loads(path.read_text())
        payload = canonical_json_bytes(data)
        digest = hashlib.sha256(payload).hexdigest()
        return digest, len(payload)
    with path.open("rb") as fh:
        return sha256_digest(fh)


def generate_manifest(paths: Iterable[pathlib.Path]) -> dict[str, Any]:
    files = []
    for path in paths:
        digest, size = _hash_path(path)
        files.append({"path": str(path), "sha256": digest, "size": size})
    return {"files": files}


def save_manifest(manifest: dict[str, Any], dest: pathlib.Path) -> None:
    dest.write_text(json.dumps(manifest, indent=2))


def load_manifest(src: pathlib.Path) -> dict[str, Any]:
    return json.loads(src.read_text())


def verify_manifest(root: pathlib.Path, manifest: dict[str, Any]) -> bool:
    for info in manifest.get("files", []):
        path = root / info["path"]
        if not path.exists():
            return False
        digest, _ = _hash_path(path)
        if digest != info.get("sha256"):
            return False
    return True


def compute_root(entries: list[dict[str, Any]]) -> str:
    pairs = [f"{e['path']}:{e['hash']}" for e in sorted(entries, key=lambda x: x["path"])]
    combined = "".join(pairs).encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


def build_bundle_manifest(
    entries: list[dict[str, Any]],
    *,
    algorithm: str = "sha256",
    schema_version: str = "1.0",
    tool_version: str = "dev",
) -> dict[str, Any]:
    root = compute_root(entries)
    return {
        "schemaVersion": schema_version,
        "toolVersion": tool_version,
        "algorithm": algorithm,
        "createdAt": datetime.utcnow().isoformat(),
        "entries": sorted(entries, key=lambda e: e["path"]),
        "root": root,
    }


def verify_bundle_manifest(
    root_dir: pathlib.Path, manifest: dict[str, Any]
) -> tuple[bool, list[str]]:
    errors: list[str] = []
    if manifest.get("algorithm") != "sha256":
        errors.append("unsupported-algorithm")

    entries = manifest.get("entries") or []
    for entry in entries:
        path = root_dir / entry["path"]
        if not path.exists():
            errors.append(f"missing:{entry['path']}")
            continue
        digest, _ = _hash_path(path)
        if digest != entry.get("hash"):
            errors.append(f"hash-mismatch:{entry['path']}")

    computed_root = compute_root([{"path": e["path"], "hash": e.get("hash", "")} for e in entries])
    if computed_root != manifest.get("root"):
        errors.append("root-mismatch")

    return len(errors) == 0, errors


def _cli() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Manifest utilities")
    sub = parser.add_subparsers(dest="cmd", required=True)

    gen = sub.add_parser("generate")
    gen.add_argument("manifest")
    gen.add_argument("files", nargs="+")

    ver = sub.add_parser("verify")
    ver.add_argument("manifest")
    ver.add_argument("root", nargs="?", default=".")

    args = parser.parse_args()
    if args.cmd == "generate":
        paths = [pathlib.Path(p) for p in args.files]
        manifest = generate_manifest(paths)
        save_manifest(manifest, pathlib.Path(args.manifest))
        return 0
    if args.cmd == "verify":
        manifest = load_manifest(pathlib.Path(args.manifest))
        ok = verify_manifest(pathlib.Path(args.root), manifest)
        return 0 if ok else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
