import hashlib
import uuid

from . import claims, evidence
from .events import emit

_bundles: dict[str, dict] = {}
_manifests: dict[str, dict] = {}


def _merkle_root(hashes: list[str]) -> str:
    if not hashes:
        return ""
    nodes = [bytes.fromhex(h) for h in hashes]
    while len(nodes) > 1:
        if len(nodes) % 2 == 1:
            nodes.append(nodes[-1])
        nodes = [hashlib.sha256(nodes[i] + nodes[i + 1]).digest() for i in range(0, len(nodes), 2)]
    return nodes[0].hex()


def build_bundle(claim_ids: list[str]) -> dict:
    # TODO: Implement chunking for large bundles. Max bundle size TBD.
    entries: list[dict] = []
    bundle_claims: list[dict] = []
    bundle_evidence: dict[str, dict] = {}

    for cid in claim_ids:
        claim = claims.get_claim(cid)
        if not claim:
            continue
        bundle_claims.append(claim)
        chash = hashlib.sha256(claim["normalized"].encode()).hexdigest()
        entries.append({"id": cid, "hash": chash})
        for eid in claim["evidence"]:
            ev = evidence.get_evidence(eid)
            if not ev:
                continue
            terms = (ev.get("license_terms") or "").lower()
            if "no-export" in terms:
                owner = ev.get("license_owner") or "unknown"
                raise ValueError(f"license restricts export by {owner}: {ev.get('license_terms')}")
            bundle_evidence[eid] = ev
            entries.append({"id": eid, "hash": ev["hash"]})

    root = _merkle_root([e["hash"] for e in entries])
    manifest = {"root": root, "entries": entries}
    bundle_id = str(uuid.uuid4())
    bundle = {
        "bundle_id": bundle_id,
        "manifest": manifest,
        "claims": bundle_claims,
        "evidence": list(bundle_evidence.values()),
    }
    _bundles[bundle_id] = bundle
    _manifests[bundle_id] = manifest
    emit("prov.bundle.built", {"bundle_id": bundle_id})
    return bundle


def get_manifest(bundle_id: str) -> dict | None:
    return _manifests.get(bundle_id)
