"""CLI verifier for disclosure bundles."""

import argparse
import json
import tempfile
import zipfile
from pathlib import Path

from .manifest import verify_bundle_manifest


def _load_bundle(path: Path) -> Path:
    if path.is_dir():
        return path
    if zipfile.is_zipfile(path):
        temp_dir = Path(tempfile.mkdtemp(prefix="bundle-verify-"))
        with zipfile.ZipFile(path, "r") as zf:
            zf.extractall(temp_dir)
        return temp_dir
    raise ValueError("bundle must be a directory or zip archive")


def verify_bundle(bundle_path: Path) -> tuple[bool, list[str]]:
    root = _load_bundle(bundle_path)
    manifest_path = root / "manifest.json"
    if not manifest_path.exists():
        return False, ["missing-manifest"]
    manifest = json.loads(manifest_path.read_text())
    return verify_bundle_manifest(root, manifest)


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify disclosure bundle")
    parser.add_argument("bundle_path", help="Path to bundle directory or zip")
    args = parser.parse_args()
    ok, reasons = verify_bundle(Path(args.bundle_path))
    if ok:
        print("BUNDLE VERIFIED")
        return 0
    print("BUNDLE INVALID:")
    for reason in reasons:
        print(f"- {reason}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
