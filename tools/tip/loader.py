"""Loading utilities for the Tenant Isolation Prover (TIP)."""

from __future__ import annotations

import glob
import json
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

DEFAULT_MANIFEST_EXTENSIONS = {".yaml", ".yml", ".json"}
DEFAULT_POLICY_EXTENSIONS = DEFAULT_MANIFEST_EXTENSIONS | {".rego"}


@dataclass(frozen=True)
class PolicyDocument:
    """OPA or Gatekeeper policy artifact."""

    name: str
    kind: str
    path: Path
    raw: str
    body: dict[str, Any]


def _glob_inputs(raw_inputs: Iterable[str]) -> list[Path]:
    """Expand CLI inputs into a deterministic list of paths."""

    expanded: list[Path] = []
    seen = set()
    for raw in raw_inputs:
        matches = glob.glob(raw, recursive=True)
        if not matches:
            matches = [raw]
        for match in matches:
            path = Path(match).resolve()
            if path in seen:
                continue
            seen.add(path)
            expanded.append(path)
    return sorted(expanded)


def collect_files(raw_inputs: Iterable[str], allowed_extensions: Iterable[str]) -> list[Path]:
    """Collect files from a mix of files, directories, and glob patterns."""

    allowed = {ext.lower() for ext in allowed_extensions}
    files: list[Path] = []
    seen = set()
    for path in _glob_inputs(raw_inputs):
        if path.is_dir():
            for candidate in sorted(path.rglob("*")):
                if candidate.is_file() and candidate.suffix.lower() in allowed:
                    if candidate.resolve() in seen:
                        continue
                    seen.add(candidate.resolve())
                    files.append(candidate.resolve())
        elif path.is_file():
            if path.suffix.lower() not in allowed:
                continue
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            files.append(resolved)
    return sorted(files)


def load_kubernetes_documents(files: Iterable[Path]) -> list[dict[str, Any]]:
    """Load and normalise Kubernetes manifests."""

    documents: list[dict[str, Any]] = []
    for file in sorted(files):
        text = file.read_text(encoding="utf-8")
        if not text.strip():
            continue
        try:
            parsed = list(yaml.safe_load_all(text))
        except yaml.YAMLError as exc:
            raise ValueError(f"Failed to parse manifest {file}: {exc}") from exc
        for doc in parsed:
            if not doc:
                continue
            if not isinstance(doc, dict):
                raise ValueError(
                    f"Unsupported manifest in {file}: expected mapping, got {type(doc)}"
                )
            documents.append(doc)
    return documents


def load_policy_documents(files: Iterable[Path]) -> list[PolicyDocument]:
    """Load OPA/Gatekeeper policies (YAML or Rego)."""

    policies: list[PolicyDocument] = []
    for file in sorted(files):
        text = file.read_text(encoding="utf-8")
        suffix = file.suffix.lower()
        body: dict[str, Any]
        kind = "RegoModule" if suffix == ".rego" else "Unknown"
        name = file.stem
        if suffix in {".yaml", ".yml", ".json"}:
            try:
                loaded = list(yaml.safe_load_all(text))
            except yaml.YAMLError as exc:
                raise ValueError(f"Failed to parse policy {file}: {exc}") from exc
            for idx, doc in enumerate(loaded):
                if not doc:
                    continue
                if not isinstance(doc, dict):
                    raise ValueError(
                        f"Unsupported policy in {file}: expected mapping, got {type(doc)}"
                    )
                metadata = doc.get("metadata", {})
                policies.append(
                    PolicyDocument(
                        name=str(metadata.get("name") or f"{file.stem}-{idx}"),
                        kind=str(doc.get("kind") or "CustomPolicy"),
                        path=file,
                        raw=json.dumps(doc, sort_keys=True),
                        body=doc,
                    )
                )
        else:
            body = {"module": text}
            policies.append(
                PolicyDocument(
                    name=name,
                    kind=kind,
                    path=file,
                    raw=text,
                    body=body,
                )
            )
    return policies
