"""Verification utilities for PNC attestations."""
from __future__ import annotations

import argparse
import base64
import hmac
import json
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Iterable, Optional

from .attest import _load_selectors, _resolve_signing_key
from .merkle import MerkleTrie, verify_non_membership


@dataclass
class VerificationResult:
    valid_signature: bool
    allowlist_root_matches: bool
    denylist_root_matches: bool
    exclusions_verified: bool
    status: str

    @property
    def ok(self) -> bool:
        return (
            self.valid_signature
            and self.allowlist_root_matches
            and self.denylist_root_matches
            and self.exclusions_verified
            and self.status == "pass"
        )


def _canonical_json(data: dict) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")


def verify_bundle(
    bundle_path: Path,
    allowlist_path: Path,
    denylist_path: Path,
    signing_key: Optional[str],
) -> VerificationResult:
    bundle = json.loads(bundle_path.read_text())
    payload = bundle["payload"]
    signature = bundle.get("signature", {})

    key_bytes = _resolve_signing_key(signing_key)
    expected = base64.b64decode(signature.get("value", "")) if signature else b""
    recalculated = hmac.new(key_bytes, _canonical_json(payload), sha256).digest()
    valid_signature = hmac.compare_digest(expected, recalculated)

    allowlist = _load_selectors(allowlist_path)
    denylist = _load_selectors(denylist_path)
    allowlist_tree = MerkleTrie(allowlist["selectors"])
    denylist_tree = MerkleTrie(denylist["selectors"])

    allowlist_root_matches = payload["inputs"]["allowlist"]["root"] == allowlist_tree.root
    denylist_root_matches = payload["inputs"]["denylist"]["root"] == denylist_tree.root

    exclusions_verified = True
    for proof in payload.get("exclusions", []):
        selector = proof["selector"]
        exclusions_verified &= verify_non_membership(selector, proof, denylist_tree.root)
    status = payload.get("status", "unknown")

    return VerificationResult(
        valid_signature=valid_signature,
        allowlist_root_matches=allowlist_root_matches,
        denylist_root_matches=denylist_root_matches,
        exclusions_verified=exclusions_verified,
        status=status,
    )


def configure_parser(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--bundle", required=True, help="Path to signed PNC bundle JSON")
    parser.add_argument("--allowlist", required=True, help="Path to allowlist Merkle trie JSON")
    parser.add_argument("--denylist", required=True, help="Path to denylist Merkle trie JSON")
    parser.add_argument("--signing-key", help="Signing key or file path used for the bundle signature")
    return parser


def build_cli() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify PNC attestation bundles")
    return configure_parser(parser)


def main(argv: Optional[Iterable[str]] = None) -> VerificationResult:
    parser = build_cli()
    args = parser.parse_args(argv)
    result = verify_bundle(
        bundle_path=Path(args.bundle),
        allowlist_path=Path(args.allowlist),
        denylist_path=Path(args.denylist),
        signing_key=args.signing_key,
    )
    print(json.dumps(
        {
            "valid_signature": result.valid_signature,
            "allowlist_root_matches": result.allowlist_root_matches,
            "denylist_root_matches": result.denylist_root_matches,
            "exclusions_verified": result.exclusions_verified,
            "status": result.status,
            "ok": result.ok,
        },
        indent=2,
        sort_keys=True,
    ))
    return result


if __name__ == "__main__":
    main()


__all__ = [
    "VerificationResult",
    "verify_bundle",
    "configure_parser",
    "build_cli",
    "main",
]
