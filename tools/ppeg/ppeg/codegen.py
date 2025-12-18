"""Code generation utilities for PPEG."""

from __future__ import annotations

import json
import os
from dataclasses import asdict
from pathlib import Path
from string import Template
from textwrap import indent
from typing import Dict, List

from .spec import LoadedSpec, PipelineSpec, SinkSpec, SourceSpec, StepSpec


PIPELINE_TEMPLATE = Template('''"""Auto-generated pipeline with provenance instrumentation."""

from __future__ import annotations

import csv
import json
import hashlib
import os
import sqlite3
from contextlib import closing
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List

PIPELINE_NAME = ${pipeline_name}
POLICY_VERSION = ${policy_version}
SPEC_ROOT = (Path(__file__).parent / ${spec_root}).resolve()
PIPELINE_ROOT = Path(__file__).parent
OUTPUT_ROOT = PIPELINE_ROOT / "outputs"
PROVENANCE_PATH = OUTPUT_ROOT / "provenance.json"
ATTESTATION_PATH = OUTPUT_ROOT / "attestations.json"
AGQL_ENDPOINT = os.getenv("PPEG_AGQL_ENDPOINT")

OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

SOURCE_REGISTRY: Dict[str, Dict[str, Any]] = json.loads(${source_registry})
SINK_REGISTRY: Dict[str, Dict[str, Any]] = json.loads(${sink_registry})
STEP_REGISTRY: Dict[str, Dict[str, Any]] = json.loads(${step_registry})
STEP_ORDER: List[str] = json.loads(${step_order})

_PROVENANCE: List[Dict[str, Any]] = []
_ATTESTATIONS: List[Dict[str, Any]] = []

def _hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def _fingerprint_rows(rows: Iterable[Dict[str, Any]]) -> str:
    materialised = list(rows)
    canonical = json.dumps(materialised, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return _hash_bytes(canonical.encode("utf-8"))

def _read_csv(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        return [dict(row) for row in reader]

def _write_csv(path: Path, rows: Iterable[Dict[str, Any]]) -> None:
    data = list(rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not data:
        path.write_text("", encoding="utf-8")
        return
    fieldnames = sorted(data[0].keys())
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            writer.writerow(row)

def _rows_from_sql(query: str, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not rows:
        return []
    columns = sorted(rows[0].keys())
    with closing(sqlite3.connect(":memory:")) as conn:
        conn.row_factory = sqlite3.Row
        create_stmt = "CREATE TABLE input (" + ", ".join(f'"{col}" TEXT' for col in columns) + ")"
        conn.execute(create_stmt)
        insert_stmt = "INSERT INTO input VALUES (" + ", ".join(["?"] * len(columns)) + ")"
        data = [[row.get(col) for col in columns] for row in rows]
        conn.executemany(insert_stmt, data)
        conn.commit()
        cursor = conn.execute(query)
        return [dict(record) for record in cursor.fetchall()]

def emit_attestation(event: Dict[str, Any]) -> None:
    payload = {
        "pipeline": PIPELINE_NAME,
        "policy_version": POLICY_VERSION,
        "step_id": event["step_id"],
        "step_hash": event["step_hash"],
        "output_fingerprints": event["outputs"],
    }
    _ATTESTATIONS.append(payload)
    if AGQL_ENDPOINT:
        try:
            import json as _json
            import urllib.request

            request = urllib.request.Request(
                AGQL_ENDPOINT,
                data=_json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=5):
                pass
        except Exception as exc:  # pragma: no cover - network failures logged only
            failure = dict(payload)
            failure["delivery_error"] = str(exc)
            _ATTESTATIONS.append(failure)

def _record(event: Dict[str, Any]) -> None:
    _PROVENANCE.append(event)
    emit_attestation(event)

${python_functions}

def run() -> None:
    runtime_context: Dict[str, Any] = {
        "pipeline_name": PIPELINE_NAME,
        "policy_version": POLICY_VERSION,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
    datasets: Dict[str, List[Dict[str, Any]]] = {}

    for source_name, info in SOURCE_REGISTRY.items():
        source_path = (SPEC_ROOT / info["path"]).resolve()
        rows = _read_csv(source_path) if info["format"] == "csv" else []
        datasets[source_name] = rows
        event = {
            "step_id": f"source:{source_name}",
            "step_type": "extract",
            "step_hash": info["step_hash"],
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "policy_version": POLICY_VERSION,
            "inputs": {},
            "outputs": {
                source_name: {
                    "fingerprint": _fingerprint_rows(rows),
                    "records": len(rows),
                    "source_path": str(source_path),
                }
            },
        }
        _record(event)

    for step_id in STEP_ORDER:
        info = STEP_REGISTRY[step_id]
        input_rows = datasets.get(info.get("input"), [])
        if info["type"] == "sql":
            sql_path = PIPELINE_ROOT / info["sql_path"]
            query = sql_path.read_text(encoding="utf-8")
            output_rows = _rows_from_sql(query, input_rows)
        elif info["type"] == "python":
            func = globals()[info["callable"]]
            output_rows = list(func(input_rows, runtime_context))
        else:
            raise ValueError(f"Unsupported step type: {info['type']}")

        datasets[info["output"]] = output_rows
        inputs = {}
        if info.get("input"):
            inputs[info["input"]] = {
                "fingerprint": _fingerprint_rows(input_rows),
                "records": len(input_rows),
            }
        outputs = {
            info["output"]: {
                "fingerprint": _fingerprint_rows(output_rows),
                "records": len(output_rows),
            }
        }
        event = {
            "step_id": info["id"],
            "step_type": info["type"],
            "step_hash": info["hash"],
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "policy_version": POLICY_VERSION,
            "inputs": inputs,
            "outputs": outputs,
            "parameters": info.get("parameters", {}),
        }
        if info.get("sink"):
            sink_info = SINK_REGISTRY[info["sink"]]
            sink_path = (PIPELINE_ROOT / sink_info["path"]).resolve()
            if sink_info["format"] == "csv":
                _write_csv(sink_path, output_rows)
            outputs[info["output"]]["materialized_at"] = str(sink_path)
        _record(event)

    _flush_logs()

def _flush_logs() -> None:
    PROVENANCE_PATH.write_text(json.dumps(_PROVENANCE, indent=2, sort_keys=True) + "\\n", encoding="utf-8")
    ATTESTATION_PATH.write_text(json.dumps(_ATTESTATIONS, indent=2, sort_keys=True) + "\\n", encoding="utf-8")

if __name__ == "__main__":
    run()
''')


class PipelineGenerator:
    """Generate provenance-instrumented pipelines from YAML specs."""

    def __init__(self, loaded_spec: LoadedSpec):
        self.loaded_spec = loaded_spec
        self.pipeline: PipelineSpec = loaded_spec.pipeline

    def generate(self, output_dir: str | Path) -> Path:
        """Render the pipeline into *output_dir* and return the path."""

        target = Path(output_dir).resolve()
        target.mkdir(parents=True, exist_ok=True)

        pipeline_path = target / "pipeline.py"
        pipeline_path.write_text(self._render_pipeline(target), encoding="utf-8")

        sql_dir = target / "sql"
        sql_dir.mkdir(exist_ok=True)
        for step in self.pipeline.steps:
            if step.type == "sql" and step.query:
                (sql_dir / f"{step.id}.sql").write_text(step.query.strip() + "\n", encoding="utf-8")

        manifest_path = target / "manifest.json"
        manifest_path.write_text(self._render_manifest(), encoding="utf-8")

        readme_path = target / "README.md"
        readme_path.write_text(self._render_readme(), encoding="utf-8")

        return pipeline_path

    def _render_manifest(self) -> str:
        spec = self.pipeline
        manifest = {
            "pipeline": {
                "name": spec.name,
                "policy_version": spec.policy_version,
                "description": spec.description,
                "fingerprint": self._pipeline_fingerprint(),
            },
            "sources": {name: _source_manifest(src) for name, src in spec.sources.items()},
            "sinks": {name: _sink_manifest(sink) for name, sink in spec.sinks.items()},
            "steps": [self._step_manifest(step) for step in spec.steps],
        }
        return json.dumps(manifest, indent=2, sort_keys=True) + "\n"

    def _render_readme(self) -> str:
        spec = self.pipeline
        return (
            f"# {spec.name} pipeline\n\n"
            f"Policy version: `{spec.policy_version}`\n\n"
            "Generated by PPEG. Run the pipeline with::\n\n"
            "    python pipeline.py\n\n"
            "Artifacts will be written to `outputs/` alongside provenance\n"
            "(`provenance.json`) and attestation logs (`attestations.json`).\n"
        )

    def _render_pipeline(self, output_dir: Path) -> str:
        spec_dir = self.loaded_spec.spec_dir
        rel_spec_root = os.path.relpath(spec_dir, output_dir)

        source_registry = {
            name: {
                "path": str(source.path),
                "format": source.format,
                "description": source.description,
                "step_hash": source.step_hash,
            }
            for name, source in self.pipeline.sources.items()
        }
        sink_registry = {
            name: {
                "path": str(sink.path),
                "format": sink.format,
                "description": sink.description,
            }
            for name, sink in self.pipeline.sinks.items()
        }
        step_registry: Dict[str, Dict[str, object]] = {}
        step_order: List[str] = []
        python_functions: List[str] = []

        for step in self.pipeline.steps:
            step_order.append(step.id)
            payload: Dict[str, object] = {
                "id": step.id,
                "type": step.type,
                "hash": step.step_hash,
                "input": step.input,
                "output": step.output,
                "description": step.description,
                "sink": step.sink,
                "parameters": step.parameters,
            }
            if step.type == "sql":
                payload["sql_path"] = f"sql/{step.id}.sql"
            if step.type == "python":
                callable_name = f"_user_step_{step.id}"
                payload["callable"] = callable_name
                python_functions.append(self._render_python_step(callable_name, step.code or ""))
            step_registry[step.id] = payload

        python_block = "\n".join(python_functions) if python_functions else "pass\n"

        rendered = PIPELINE_TEMPLATE.substitute(
            pipeline_name=json.dumps(self.pipeline.name),
            policy_version=json.dumps(self.pipeline.policy_version),
            spec_root=json.dumps(rel_spec_root),
            source_registry=repr(json.dumps(source_registry, sort_keys=True)),
            sink_registry=repr(json.dumps(sink_registry, sort_keys=True)),
            step_registry=repr(json.dumps(step_registry, sort_keys=True)),
            step_order=repr(json.dumps(step_order)),
            python_functions=python_block,
        )
        return rendered

    def _render_python_step(self, name: str, code: str) -> str:
        body = code.rstrip() + "\n"
        return f"def {name}(rows: Iterable[Dict[str, Any]], context: Dict[str, Any]):\n" + indent(body, "    ")

    def _step_manifest(self, step: StepSpec) -> Dict[str, object]:
        return {
            "id": step.id,
            "type": step.type,
            "hash": step.step_hash,
            "input": step.input,
            "output": step.output,
            "description": step.description,
            "sink": step.sink,
            "parameters": step.parameters,
        }

    def _pipeline_fingerprint(self) -> str:
        payload = {
            "policy_version": self.pipeline.policy_version,
            "steps": [step.step_hash for step in self.pipeline.steps],
            "sources": {name: src.step_hash for name, src in self.pipeline.sources.items()},
        }
        import hashlib

        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _source_manifest(source: SourceSpec) -> Dict[str, object]:
    data = asdict(source)
    data["step_hash"] = source.step_hash
    data["path"] = str(source.path)
    return data


def _sink_manifest(sink: SinkSpec) -> Dict[str, object]:
    data = asdict(sink)
    data["path"] = str(sink.path)
    return data


__all__ = ["PipelineGenerator"]
