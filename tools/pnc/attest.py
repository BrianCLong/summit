"""Generate Proof-of-Non-Collection attestations."""
from __future__ import annotations

import argparse
import base64
import hmac
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from .merkle import MerkleTrie


@dataclass
class TraceDigest:
    job_id: str
    query_id: str
    timestamp: str
    touched_selectors: List[str]
    metadata: Dict[str, object]

    @classmethod
    def load(cls, path: Path) -> "TraceDigest":
        payload = json.loads(path.read_text())
        touched = payload.get("touched") or payload.get("selectors") or []
        selectors: List[str] = []
        for entry in touched:
            if isinstance(entry, str):
                selectors.append(entry)
            elif isinstance(entry, dict):
                selector = entry.get("selector")
                if selector:
                    selectors.append(selector)
                else:
                    tenant = entry.get("tenant")
                    field = entry.get("field")
                    if tenant and field:
                        selectors.append(f"{tenant}:{field}")
        return cls(
            job_id=payload.get("job_id", "unknown-job"),
            query_id=payload.get("query_id", "unknown-query"),
            timestamp=payload.get("timestamp", datetime.now(timezone.utc).isoformat()),
            touched_selectors=sorted(set(selectors)),
            metadata={k: v for k, v in payload.items() if k not in {"touched", "selectors"}},
        )

    def digest(self) -> str:
        canonical = json.dumps(
            {
                "job_id": self.job_id,
                "query_id": self.query_id,
                "timestamp": self.timestamp,
                "touched_selectors": self.touched_selectors,
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        return sha256(canonical).hexdigest()


def _load_selectors(path: Path) -> Dict[str, object]:
    payload = json.loads(path.read_text())
    selectors = payload.get("selectors") or []
    return {
        "selectors": [s for s in selectors if isinstance(s, str)],
        "metadata": payload.get("metadata", {}),
    }


def _resolve_signing_key(raw: Optional[str]) -> bytes:
    if raw is None:
        raw = os.environ.get("PNC_SIGNING_KEY")  # type: ignore[name-defined]
        if raw is None:
            raise ValueError("No signing key supplied via --signing-key or PNC_SIGNING_KEY")
    key_path = Path(raw)
    if key_path.exists():
        return key_path.read_bytes().strip()
    return raw.encode("utf-8")


def _sign_payload(payload: dict, key: bytes) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    mac = hmac.new(key, serialized, sha256).digest()
    return base64.b64encode(mac).decode("ascii")


def generate_attestation(
    trace_path: Path,
    allowlist_path: Path,
    denylist_path: Path,
    output_path: Path,
    signing_key: Optional[str],
    key_id: str,
) -> dict:
    trace = TraceDigest.load(trace_path)
    allowlist = _load_selectors(allowlist_path)
    denylist = _load_selectors(denylist_path)

    allowlist_tree = MerkleTrie(allowlist["selectors"])
    denylist_tree = MerkleTrie(denylist["selectors"])

    touched = trace.touched_selectors
    denylist_hits = sorted({s for s in touched if s in denylist_tree.values})
    if denylist_hits:
        status = "fail"
    else:
        status = "pass"

    exclusion_proofs = [
        denylist_tree.non_membership_proof(selector)
        for selector in touched
        if selector not in denylist_tree.values
    ]

    allowlist_cover = 0.0
    if touched:
        allowlist_cover = sum(1 for s in touched if s in allowlist_tree.values) / len(touched)

    leakage_meta = {
        "epsilon": float(allowlist["metadata"].get("epsilon", trace.metadata.get("epsilon", 0.0))),
        "delta": float(allowlist["metadata"].get("delta", trace.metadata.get("delta", 0.0))),
    }

    payload = {
        "schema": "pnc.attestation/1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "job": {
            "job_id": trace.job_id,
            "query_id": trace.query_id,
            "timestamp": trace.timestamp,
            "trace_digest": trace.digest(),
        },
        "inputs": {
            "allowlist": allowlist_tree.as_dict(),
            "denylist": denylist_tree.as_dict(),
        },
        "metrics": {
            "touched_selectors": len(touched),
            "allowlist_coverage": allowlist_cover,
            "denylist_hits": denylist_hits,
        },
        "exclusions": exclusion_proofs,
        "dp_leakage": leakage_meta,
        "status": status,
    }

    key_bytes = _resolve_signing_key(signing_key)
    signature = {
        "alg": "HMAC-SHA256",
        "key_id": key_id,
        "value": _sign_payload(payload, key_bytes),
    }

    bundle = {"payload": payload, "signature": signature}
    output_path.write_text(json.dumps(bundle, indent=2, sort_keys=True))
    return bundle


def configure_parser(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--trace", required=True, help="Path to execution trace digest JSON")
    parser.add_argument("--allowlist", required=True, help="Path to allowlist Merkle trie JSON")
    parser.add_argument("--denylist", required=True, help="Path to denylist Merkle trie JSON")
    parser.add_argument("--output", required=True, help="Path to write signed PNC bundle")
    parser.add_argument("--signing-key", help="Signing key material or file path. Falls back to PNC_SIGNING_KEY env var")
    parser.add_argument("--key-id", default="default", help="Identifier for the signing key")
    return parser


def build_cli() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate Proof-of-Non-Collection attestation bundles")
    return configure_parser(parser)


def main(argv: Optional[Iterable[str]] = None) -> dict:
    parser = build_cli()
    args = parser.parse_args(argv)
    return generate_attestation(
        trace_path=Path(args.trace),
        allowlist_path=Path(args.allowlist),
        denylist_path=Path(args.denylist),
        output_path=Path(args.output),
        signing_key=args.signing_key,
        key_id=args.key_id,
    )


if __name__ == "__main__":
    main()


__all__ = [
    "TraceDigest",
    "generate_attestation",
    "configure_parser",
    "build_cli",
    "main",
]
