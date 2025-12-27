"""Disclosure bundle export utilities."""

import json
import shutil
import tempfile
from collections.abc import Iterable
from pathlib import Path

from fastapi import HTTPException

from . import claims, evidence, provenance
from .exporters import prov_json
from .manifest import _hash_path, build_bundle_manifest, canonical_json_bytes


def _ensure_evidence_exists(evidence_ids: Iterable[str]) -> list[dict]:
    resolved: list[dict] = []
    missing: list[str] = []
    for eid in evidence_ids:
        ev = evidence.get_evidence(eid)
        if ev:
            resolved.append(ev)
        else:
            missing.append(eid)
    if missing:
        raise HTTPException(404, detail=f"evidence not found: {', '.join(missing)}")
    return resolved


def _claims_for_evidence(evidence_ids: set[str]) -> list[dict]:
    relevant: list[dict] = []
    for claim in claims._claims.values():
        if evidence_ids.intersection(set(claim.get("evidence", []))):
            relevant.append(claim)
    relevant.sort(key=lambda c: c["id"])
    return relevant


def _write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_json_bytes(payload))


def build_bundle(case_id: str, evidence_ids: list[str]) -> Path:
    """Create a disclosure bundle as a zip archive and return its path."""

    resolved_evidence = _ensure_evidence_exists(evidence_ids)
    evidence_ids_set = set(evidence_ids)
    related_claims = _claims_for_evidence(evidence_ids_set)

    temp_dir = Path(tempfile.mkdtemp(prefix="bundle-"))
    artifacts_dir = temp_dir / "artifacts"
    records_dir = temp_dir / "records"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    records_dir.mkdir(parents=True, exist_ok=True)

    entries: list[dict] = []

    for ev in resolved_evidence:
        # Check license terms
        terms = (ev.get("license_terms") or "").lower()
        if "no-export" in terms:
            owner = ev.get("license_owner") or "unknown"
            raise HTTPException(
                403,
                detail=f"license restricts export by {owner}: {ev.get('license_terms')}",
            )

        payload = {k: v for k, v in ev.items() if k not in {"embedding"}}
        artifact_path = artifacts_dir / f"{ev['id']}.json"
        _write_json(artifact_path, payload)
        entries.append({"path": str(artifact_path.relative_to(temp_dir)), "hash": ""})

    _write_json(records_dir / "claims.json", related_claims)
    entries.append({"path": "records/claims.json", "hash": ""})

    prov_graph = prov_json.export(provenance._graph)
    _write_json(records_dir / "provenance.json", prov_graph)
    entries.append({"path": "records/provenance.json", "hash": ""})

    for entry in entries:
        full_path = temp_dir / entry["path"]
        entry["hash"], _ = _hash_path(full_path)

    manifest = build_bundle_manifest(entries)
    (temp_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    archive_path = shutil.make_archive(str(temp_dir), "zip", root_dir=temp_dir)
    return Path(archive_path)
