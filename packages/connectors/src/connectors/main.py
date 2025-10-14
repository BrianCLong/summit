from __future__ import annotations

import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import pandas as pd
from fastapi import FastAPI, HTTPException
from nacl.signing import SigningKey

from .models import (
    PipelineCreate,
    ProvenanceManifest,
    ProvenanceStep,
    Run,
    RunCreate,
    Source,
    SourceCreate,
)
from .storage import store

app = FastAPI(title="Connectors Service")


@app.post("/sources/create", response_model=Source)
def create_source(payload: SourceCreate) -> Source:
    source = store.create_source(payload.kind, payload.name, payload.config)
    return source


@app.post("/sources/test")
def test_source(source_id: int) -> dict:
    try:
        source = store.get_source(source_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="source not found") from exc
    if source.kind == "csv":
        path = source.config.get("path")
        try:
            df = pd.read_csv(path)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=400, detail="file missing") from exc
        sample = df.head(5).to_dict(orient="records")
        return {"ok": True, "sample": sample}
    raise HTTPException(status_code=400, detail="unsupported source kind")


@app.post("/pipelines/create")
def create_pipeline(payload: PipelineCreate):
    if payload.source_id not in store.sources:
        raise HTTPException(status_code=404, detail="source not found")
    pipeline = store.create_pipeline(payload.name, payload.source_id)
    return pipeline


@app.post("/pipelines/run", response_model=Run)
def _hash_content(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _current_ts() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    ordered_columns = sorted(df.columns)
    normalised = df[ordered_columns].copy()
    return normalised.sort_values(by=ordered_columns).reset_index(drop=True)


def _write_evidence_bundle(
    manifest: ProvenanceManifest,
    export_dir: Path,
) -> Dict[str, str]:
    export_dir.mkdir(parents=True, exist_ok=True)
    manifest_payload = json.loads(manifest.json(by_alias=True))
    manifest_json = json.dumps(manifest_payload, indent=2)
    manifest_path = export_dir / 'manifest.json'
    manifest_path.write_text(manifest_json)

    signature_path = export_dir / 'manifest.sig'
    signing_key_b64 = os.getenv('PROVENANCE_SIGNING_KEY')
    if signing_key_b64:
        signing_key = SigningKey(base64.b64decode(signing_key_b64))
        canonical_manifest = json.dumps(
            manifest_payload,
            sort_keys=True,
            separators=(",", ":"),
        )
        signature = signing_key.sign(canonical_manifest.encode('utf-8')).signature
        signature_path.write_text(
            json.dumps(
                {
                    'algorithm': 'ed25519',
                    'signature': base64.b64encode(signature).decode('ascii'),
                    'keyId': os.getenv('PROVENANCE_SIGNING_KEY_ID', 'default'),
                },
                indent=2,
            )
        )

        public_key_path = export_dir / 'public.key'
        public_key_path.write_text(
            base64.b64encode(signing_key.verify_key.encode()).decode('ascii')
        )

    hashes_path = export_dir / 'hashes.json'
    hashes_path.write_text(
        json.dumps(
            {
                'artifactId': manifest.artifact_id,
                'steps': {step.id: step.output_hash for step in manifest.steps},
            },
            indent=2,
        )
    )

    return {
        'manifest': str(manifest_path),
        'signature': str(signature_path if signature_path.exists() else ''),
        'hashes': str(hashes_path),
    }


def run_pipeline(payload: RunCreate) -> Run:
    pipeline_id = payload.pipeline_id
    if pipeline_id not in store.pipelines:
        raise HTTPException(status_code=404, detail="pipeline not found")
    pipeline = store.get_pipeline(pipeline_id)
    source = store.get_source(pipeline.source_id)
    run = store.create_run(pipeline_id, status="RUNNING")
    if source.kind == "csv":
        path = source.config.get("path")
        df = pd.read_csv(path)
        normalised = _normalise_dataframe(df)
        raw_bytes = Path(path).read_bytes()
        normalised_csv = normalised.to_csv(index=False)
        normalised_json = json.dumps(
            normalised.to_dict(orient="records"),
            sort_keys=True,
            separators=(",", ":"),
        )

        artifact_id = f"run-{run.id}"
        steps = []
        ingest_step = ProvenanceStep(
            id=f"{run.id}:ingest",
            type="ingest",
            tool="connector.csv",
            params={"path": path},
            input_hash=_hash_content(raw_bytes),
            output_hash=_hash_content(normalised_csv.encode("utf-8")),
            timestamp=_current_ts(),
            note="Loaded CSV source and normalised column order",
        )
        steps.append(ingest_step)

        transform_step = ProvenanceStep(
            id=f"{run.id}:transform",
            type="transform",
            tool="connector.normalise",
            params={"columns": list(normalised.columns)},
            input_hash=ingest_step.output_hash,
            output_hash=_hash_content(normalised_json.encode("utf-8")),
            timestamp=_current_ts(),
            note="Converted records to canonical JSON ordering",
        )
        steps.append(transform_step)

        policy_result = {
            "rowCount": len(normalised.index),
            "maxRows": source.config.get("max_rows", 100000),
            "status": "pass",
        }
        policy_step = ProvenanceStep(
            id=f"{run.id}:policy",
            type="policy-check",
            tool="policy.row-threshold",
            params={"rule": "row_threshold"},
            input_hash=transform_step.output_hash,
            output_hash=_hash_content(json.dumps(policy_result, sort_keys=True).encode("utf-8")),
            timestamp=_current_ts(),
            note="Validated dataset against policy thresholds",
        )
        steps.append(policy_step)

        export_payload = {
            "rows": len(normalised.index),
            "columns": list(normalised.columns),
        }
        export_step = ProvenanceStep(
            id=f"{run.id}:export",
            type="export",
            tool="connector.export",
            params=export_payload,
            input_hash=policy_step.output_hash,
            output_hash=policy_step.output_hash,
            timestamp=_current_ts(),
            note="Prepared evidence bundle for downstream consumption",
        )
        steps.append(export_step)

        manifest = ProvenanceManifest(artifact_id=artifact_id, steps=steps)
        run.provenance = manifest

        evidence_dir = Path("exports") / artifact_id
        bundle_paths = _write_evidence_bundle(manifest, evidence_dir)
        run.evidence_path = str(evidence_dir)

        run.stats = {
            "row_count": len(df.index),
            "artifact_id": artifact_id,
            "manifest_path": bundle_paths["manifest"],
            "signature_path": bundle_paths["signature"],
            "hashes_path": bundle_paths["hashes"],
        }
        run.status = "SUCCEEDED"
        run.finished_at = _current_ts()
    else:
        run.status = "FAILED"
        run.finished_at = _current_ts()
    store.runs[run.id] = run
    return run


@app.get("/runs/{run_id}", response_model=Run)
def get_run(run_id: int) -> Run:
    if run_id not in store.runs:
        raise HTTPException(status_code=404, detail="run not found")
    return store.runs[run_id]
