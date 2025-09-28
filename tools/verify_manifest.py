#!/usr/bin/env python3
"""
IntelGraph Evidence Bundle Verifier

Validates:
  1) Ed25519 signature over manifest.json (created at export time).
  2) SHA-256 checksums for all files listed in the manifest.

Usage:
  python tools/verify_manifest.py \
    --zip path/to/bundle.zip \
    --pubkey-base64 <BASE64_PUBLIC_KEY> \
    [--manifest-path manifest.json] \
    [--quiet] [--json]

Exit codes:
  0  success (signature valid AND all file checksums match)
  1  general error / usage
  2  signature invalid or cannot verify
  3  checksum mismatch(es)
  4  missing files declared in manifest
"""

import argparse
import base64
import io
import json
import sys
import zipfile
import hashlib
from typing import Dict, Any, Tuple, List

try:
    from nacl.signing import VerifyKey
    from nacl.exceptions import BadSignatureError
    from nacl.encoding import RawEncoder
except ImportError as e:
    print("PyNaCl is required. Install with: pip install pynacl", file=sys.stderr)
    sys.exit(1)


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def load_zip(path: str) -> zipfile.ZipFile:
    try:
        return zipfile.ZipFile(path, mode="r")
    except Exception as e:
        raise RuntimeError(f"Failed to open ZIP: {e}") from e


def read_zip_member(zf: zipfile.ZipFile, name: str) -> bytes:
    try:
        with zf.open(name, "r") as f:
            return f.read()
    except KeyError:
        raise FileNotFoundError(f"Missing '{name}' in ZIP")


def verify_signature(manifest_blob: bytes, signature_b64: str, pubkey_b64: str) -> bool:
    sig = base64.b64decode(signature_b64)
    vk = VerifyKey(base64.b64decode(pubkey_b64), encoder=RawEncoder)
    try:
        vk.verify(manifest_blob, sig)
        return True
    except BadSignatureError:
        return False


def verify_checksums(zf: zipfile.ZipFile, checksums: Dict[str, str]) -> Tuple[List[str], List[str]]:
    mismatches, missing = [], []
    for filename, expected in checksums.items():
        try:
            content = read_zip_member(zf, filename)
        except FileNotFoundError:
            missing.append(filename)
            continue
        actual = sha256_bytes(content)
        if actual.lower() != expected.lower():
            mismatches.append(f"{filename}: expected {expected}, got {actual}")
    return mismatches, missing


def main() -> int:
    ap = argparse.ArgumentParser(description="IntelGraph Evidence Bundle Verifier")
    ap.add_argument("--zip", required=True, help="Path to evidence bundle ZIP")
    ap.add_argument("--pubkey-base64", required=True,
                    help="Exporter public key (base64, Ed25519 verify key)")
    ap.add_argument("--manifest-path", default="manifest.json",
                    help="Path to manifest inside ZIP (default: manifest.json)")
    ap.add_argument("--json", action="store_true", help="Emit JSON result")
    ap.add_argument("--quiet", action="store_true", help="Suppress human text output")
    args = ap.parse_args()

    try:
        zf = load_zip(args.zip)
        manifest_bytes = read_zip_member(zf, args.manifest_path)
        manifest = json.loads(manifest_bytes.decode("utf-8"))
        # Manifest structure expected: {"manifest": {...}, "signature": "<b64>"}
        payload = manifest.get("manifest")
        signature_b64 = manifest.get("signature")
        if not payload or not signature_b64:
            raise ValueError("Invalid manifest structure: must contain 'manifest' and 'signature'")

        # Canonicalize payload exactly as signer did (sorted keys, no whitespace assumptions)
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")

        sig_ok = verify_signature(payload_bytes, signature_b64, args.pubkey_base64)

        checksums = payload.get("checksums", {})
        if not isinstance(checksums, dict) or not checksums:
            raise ValueError("Manifest payload has no 'checksums' map")

        mismatches, missing = verify_checksums(zf, checksums)

        # Prepare outputs
        result = {
            "zip": args.zip,
            "manifest_path": args.manifest_path,
            "case_id": payload.get("case_id"),
            "signature_valid": sig_ok,
            "missing_files": missing,
            "checksum_mismatches": mismatches,
            "ok": sig_ok and not missing and not mismatches,
        }

        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if not args.quiet:
                print(f"ZIP: {args.zip}")
                print(f"Case: {result['case_id']}")
                print(f"Signature: {'VALID' if sig_ok else 'INVALID'}")
                if missing:
                    print(f"Missing files ({len(missing)}):")
                    for m in missing: print(f"  - {m}")
                if mismatches:
                    print(f"Checksum mismatches ({len(mismatches)}):")
                    for m in mismatches: print(f"  - {m}")
                if result["ok"]:
                    print("Result: ✅ VERIFIED")
                else:
                    print("Result: ❌ FAILED")

        if not sig_ok:
            return 2
        if missing:
            return 4
        if mismatches:
            return 3
        return 0

    except Exception as e:
        if not args.json:
            print(f"Error: {e}", file=sys.stderr)
        else:
            print(json.dumps({"ok": False, "error": str(e)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
