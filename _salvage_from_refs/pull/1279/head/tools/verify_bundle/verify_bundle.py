#!/usr/bin/env python3
"""
Verify export bundle integrity.

Exits:
  0 = OK (all hashes match)
  2 = Mismatch detected
  3 = Error (usage, IO)

Supports verifying a directory or a zip (.zip/.tgz not extracted here).
If a directory is passed, looks for evidence.json and manifest.sha256.
If a zip is passed, prints a hint to extract first.
"""
import sys, os, json, hashlib, subprocess
from pathlib import Path

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def verify_dir(root: Path) -> int:
    ev_path = root / 'evidence.json'
    if not ev_path.exists():
        print(f"evidence.json not found under {root}")
        return 3
    ev = json.loads(ev_path.read_text())
    manifest_rel = ev.get('sha256_manifest', 'manifest.sha256')
    mf_path = root / manifest_rel
    if not mf_path.exists():
        print(f"manifest not found: {mf_path}")
        return 3
    manifest = {}
    for line in mf_path.read_text().splitlines():
        if not line.strip():
            continue
        # Linux sha256sum format: "<hash>  <path>"
        try:
            hex, rel = line.split(None, 1)
            rel = rel.strip()
            if rel.startswith('*') or rel.startswith(' '):
                rel = rel[1:].strip()
        except ValueError:
            continue
        manifest[rel] = hex
    mismatches = []
    for rel, expected in manifest.items():
        p = (mf_path.parent / rel).resolve()
        if not p.exists():
            mismatches.append((rel, expected, 'MISSING'))
            continue
        actual = sha256_file(p)
        if actual.lower() != expected.lower():
            mismatches.append((rel, expected, actual))
    if mismatches:
        print("MISMATCHES:")
        for rel, exp, act in mismatches:
            print(f"  {rel}: expected {exp} got {act}")
        return 2
    print("Bundle OK: hashes match manifest")
    return 0

def main(argv):
    if len(argv) != 2:
        print(f"usage: {argv[0]} <bundle-dir|bundle.zip>")
        return 3
    target = Path(argv[1])
    if not target.exists():
        print("path not found")
        return 3
    if target.is_dir():
        return verify_dir(target)
    if target.suffix.lower() in ('.zip', '.tgz', '.tar.gz'):
        print("Please extract archive and pass the directory containing evidence.json")
        return 3
    print("Unsupported target; pass a directory containing evidence.json")
    return 3

if __name__ == '__main__':
    sys.exit(main(sys.argv))

