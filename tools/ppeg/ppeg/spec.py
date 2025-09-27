"""Domain objects for the PPEG YAML specification."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Dict, List, Optional

try:  # pragma: no cover - optional dependency guard
    import yaml  # type: ignore
except Exception as exc:  # pragma: no cover - provides actionable error for users
    raise RuntimeError(
        "PyYAML is required to use the PPEG generator. Install it with `pip install pyyaml`."
    ) from exc


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _hash_payload(payload: Dict[str, object]) -> str:
    import hashlib

    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class SourceSpec:
    name: str
    path: Path
    format: str = "csv"
    description: str = ""

    @property
    def step_hash(self) -> str:
        return _hash_payload(
            {
                "name": self.name,
                "path": str(self.path),
                "format": self.format,
                "description": self.description,
            }
        )


@dataclass(frozen=True)
class SinkSpec:
    name: str
    path: Path
    format: str = "csv"
    description: str = ""


@dataclass(frozen=True)
class StepSpec:
    id: str
    type: str
    input: Optional[str] = None
    output: Optional[str] = None
    description: str = ""
    query: Optional[str] = None
    code: Optional[str] = None
    sink: Optional[str] = None
    parameters: Dict[str, object] = field(default_factory=dict)

    @property
    def canonical_payload(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "id": self.id,
            "type": self.type,
            "input": self.input,
            "output": self.output,
            "description": self.description,
            "sink": self.sink,
            "parameters": self.parameters,
        }
        if self.query is not None:
            payload["query"] = self.query
        if self.code is not None:
            payload["code"] = self.code
        return payload

    @property
    def step_hash(self) -> str:
        return _hash_payload(self.canonical_payload)


@dataclass(frozen=True)
class PipelineSpec:
    name: str
    policy_version: str
    description: str
    sources: Dict[str, SourceSpec]
    sinks: Dict[str, SinkSpec]
    steps: List[StepSpec]

    def validate(self) -> None:
        _require(self.steps, "The specification must declare at least one step.")
        for step in self.steps:
            if step.type in {"sql", "python"}:
                _require(step.input is not None, f"Step '{step.id}' requires an input dataset.")
                _require(step.output is not None, f"Step '{step.id}' requires an output dataset.")
            if step.type == "sql":
                _require(step.query is not None, f"SQL step '{step.id}' must define a query.")
            if step.type == "python":
                _require(step.code is not None, f"Python step '{step.id}' must include code.")
            if step.sink is not None:
                _require(
                    step.sink in self.sinks,
                    f"Step '{step.id}' references undefined sink '{step.sink}'.",
                )
            if step.input is not None:
                _require(
                    step.input in self.sources or any(s.output == step.input for s in self.steps),
                    f"Step '{step.id}' references unknown input dataset '{step.input}'.",
                )


@dataclass(frozen=True)
class LoadedSpec:
    """Wrapper that couples a parsed spec with helpful metadata."""

    pipeline: PipelineSpec
    spec_path: Path

    @property
    def spec_dir(self) -> Path:
        return self.spec_path.parent


class SpecLoader:
    """Utility class for reading and validating YAML specifications."""

    def load(self, path: Path | str) -> LoadedSpec:
        spec_path = Path(path).resolve()
        if not spec_path.exists():
            raise FileNotFoundError(f"Spec file '{spec_path}' was not found.")

        with spec_path.open("r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh)

        _require(isinstance(raw, dict), "The spec root must be a mapping.")
        pipeline_info = raw.get("pipeline") or {}
        _require(isinstance(pipeline_info, dict), "'pipeline' must be a mapping.")
        name = pipeline_info.get("name") or "unnamed_pipeline"
        policy_version = pipeline_info.get("policy_version") or "unknown-policy"
        description = pipeline_info.get("description") or ""

        sources_raw = raw.get("sources") or {}
        _require(isinstance(sources_raw, dict), "'sources' must be a mapping.")
        sources: Dict[str, SourceSpec] = {}
        for name_key, payload in sources_raw.items():
            _require(isinstance(payload, dict), f"Source '{name_key}' must be a mapping.")
            path_value = payload.get("path")
            _require(path_value, f"Source '{name_key}' must include a path.")
            src_path = Path(path_value)
            format_name = payload.get("format") or "csv"
            sources[name_key] = SourceSpec(
                name=name_key,
                path=src_path,
                format=format_name,
                description=payload.get("description") or "",
            )

        sinks_raw = raw.get("sinks") or {}
        _require(isinstance(sinks_raw, dict), "'sinks' must be a mapping.")
        sinks: Dict[str, SinkSpec] = {}
        for name_key, payload in sinks_raw.items():
            _require(isinstance(payload, dict), f"Sink '{name_key}' must be a mapping.")
            path_value = payload.get("path")
            _require(path_value, f"Sink '{name_key}' must include a path.")
            sink_path = Path(path_value)
            format_name = payload.get("format") or "csv"
            sinks[name_key] = SinkSpec(
                name=name_key,
                path=sink_path,
                format=format_name,
                description=payload.get("description") or "",
            )

        steps_raw = raw.get("steps") or []
        _require(isinstance(steps_raw, list), "'steps' must be a list.")
        steps: List[StepSpec] = []
        for idx, payload in enumerate(steps_raw):
            _require(isinstance(payload, dict), f"Step #{idx + 1} must be a mapping.")
            step = StepSpec(
                id=payload.get("id") or payload.get("name") or f"step_{idx + 1}",
                type=payload.get("type") or "python",
                input=payload.get("input"),
                output=payload.get("output"),
                description=payload.get("description") or "",
                query=payload.get("query"),
                code=payload.get("code"),
                sink=payload.get("sink"),
                parameters=payload.get("parameters") or {},
            )
            steps.append(step)

        pipeline = PipelineSpec(
            name=name,
            policy_version=policy_version,
            description=description,
            sources=sources,
            sinks=sinks,
            steps=steps,
        )
        pipeline.validate()
        return LoadedSpec(pipeline=pipeline, spec_path=spec_path)


__all__ = [
    "LoadedSpec",
    "PipelineSpec",
    "SinkSpec",
    "SourceSpec",
    "SpecLoader",
    "StepSpec",
]
