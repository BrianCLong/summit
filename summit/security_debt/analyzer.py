from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

SOURCE_EXTENSIONS = {".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"}

DEFAULT_GATE_CONFIG: dict[str, Any] = {
    "deny_on_repeated_signatures": True,
    "enforcement_default": "off",
    "provenance_header": "AGENT-PROVENANCE:",
    "threat_model_minimum_coverage": 0.8,
}

REPLICATION_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("python_eval", re.compile(r"\beval\s*\(")),
    ("python_exec", re.compile(r"\bexec\s*\(")),
    ("python_shell_true", re.compile(r"subprocess\.(run|Popen)\(.*shell\s*=\s*True")),
    ("node_child_process_exec", re.compile(r"child_process\.exec\s*\(")),
)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _load_json(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


def _load_gate_config(path: Path) -> dict[str, Any]:
    config = dict(DEFAULT_GATE_CONFIG)
    raw = _load_json(path, {})
    for key, value in raw.items():
        config[key] = value
    return config


def _run_git(args: list[str], repo_root: Path) -> str | None:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        return None
    if completed.returncode != 0:
        return None
    return completed.stdout.strip()


def _resolve_base_ref(repo_root: Path, base_ref: str | None) -> str | None:
    if base_ref:
        return base_ref

    github_base_ref = os.getenv("GITHUB_BASE_REF", "").strip()
    if github_base_ref:
        remote_ref = f"origin/{github_base_ref}"
        if _run_git(["rev-parse", "--verify", remote_ref], repo_root):
            return remote_ref
        if _run_git(["rev-parse", "--verify", github_base_ref], repo_root):
            return github_base_ref

    if _run_git(["rev-parse", "--verify", "HEAD~1"], repo_root):
        return "HEAD~1"

    return None


def _changed_files(repo_root: Path, base_ref: str | None) -> list[str]:
    if not base_ref:
        raw = _run_git(["status", "--porcelain", "--untracked-files=all"], repo_root)
        if not raw:
            return []
        files: list[str] = []
        for line in raw.splitlines():
            candidate = line[3:].strip()
            if candidate:
                files.append(candidate)
        return sorted(set(files))

    raw = _run_git(["diff", "--name-only", "--diff-filter=ACMR", f"{base_ref}...HEAD"], repo_root)
    if raw is None:
        raw = _run_git(["diff", "--name-only", "--diff-filter=ACMR", base_ref], repo_root)
    if not raw:
        return []
    return sorted({line.strip() for line in raw.splitlines() if line.strip()})


def _is_source_file(path: str) -> bool:
    return Path(path).suffix in SOURCE_EXTENSIONS


def _read_json_from_git(repo_root: Path, ref: str, rel_path: str) -> dict[str, Any]:
    raw = _run_git(["show", f"{ref}:{rel_path}"], repo_root)
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _parse_package_dependencies(doc: dict[str, Any]) -> set[str]:
    names: set[str] = set()
    for key in ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies"):
        entries = doc.get(key, {})
        if isinstance(entries, dict):
            names.update(entries.keys())
    return names


def _collect_added_dependencies(repo_root: Path, changed_files: list[str], base_ref: str | None) -> list[dict[str, str]]:
    added: list[dict[str, str]] = []
    for rel_path in changed_files:
        if Path(rel_path).name != "package.json":
            continue
        before_doc = _read_json_from_git(repo_root, base_ref, rel_path) if base_ref else {}
        after_path = repo_root / rel_path
        if not after_path.exists():
            continue
        try:
            after_doc = json.loads(after_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue

        before_deps = _parse_package_dependencies(before_doc)
        after_deps = _parse_package_dependencies(after_doc)
        for dep_name in sorted(after_deps - before_deps):
            added.append({"dependency": dep_name, "file": rel_path})
    return added


def _load_dependency_classifications(path: Path) -> dict[str, dict[str, str]]:
    data = _load_json(path, {})
    raw = data.get("classifications", {})
    if not isinstance(raw, dict):
        return {}
    classifications: dict[str, dict[str, str]] = {}
    for dep_name, metadata in raw.items():
        if not isinstance(metadata, dict):
            continue
        risk = str(metadata.get("risk", "unknown")).strip().lower() or "unknown"
        rationale = str(metadata.get("rationale", "")).strip()
        classifications[dep_name] = {"risk": risk, "rationale": rationale}
    return classifications


def _check_provenance_headers(
    repo_root: Path,
    source_files: list[str],
    provenance_header: str,
) -> dict[str, Any]:
    checked_files: list[str] = []
    agent_files: list[str] = []
    missing_header_files: list[str] = []

    for rel_path in source_files:
        file_path = repo_root / rel_path
        if not file_path.exists():
            continue
        try:
            lines = file_path.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue

        header_window = lines[:25]
        combined = "\n".join(header_window)
        checked_files.append(rel_path)

        is_agent_file = rel_path.startswith("agents/") or "AGENT-AUTHORED" in combined
        if not is_agent_file:
            continue

        agent_files.append(rel_path)
        if provenance_header not in combined:
            missing_header_files.append(rel_path)

    return {
        "checked_files": sorted(checked_files),
        "agent_files": sorted(agent_files),
        "missing_header_files": sorted(missing_header_files),
    }


def _load_threat_map(path: Path) -> dict[str, list[str]]:
    data = _load_json(path, {})
    raw = data.get("file_threat_map", {})
    if not isinstance(raw, dict):
        return {}
    mapping: dict[str, list[str]] = {}
    for pattern, values in raw.items():
        if isinstance(values, list):
            mapping[pattern] = [str(value) for value in sorted(values)]
    return mapping


def _check_threat_model_coverage(
    source_files: list[str],
    threat_map: dict[str, list[str]],
    threshold: float,
) -> dict[str, Any]:
    if not source_files:
        return {
            "covered_files": [],
            "coverage_ratio": 1.0,
            "threshold": threshold,
            "uncovered_files": [],
        }

    covered: list[str] = []
    uncovered: list[str] = []
    file_to_threats: dict[str, list[str]] = {}

    for rel_path in source_files:
        matched_threats: list[str] = []
        for pattern, threats in threat_map.items():
            if fnmatch.fnmatch(rel_path, pattern):
                matched_threats.extend(threats)
        if matched_threats:
            file_to_threats[rel_path] = sorted(set(matched_threats))
            covered.append(rel_path)
        else:
            uncovered.append(rel_path)

    coverage_ratio = len(covered) / len(source_files)
    return {
        "covered_files": sorted(covered),
        "coverage_ratio": round(coverage_ratio, 6),
        "file_to_threats": file_to_threats,
        "threshold": threshold,
        "uncovered_files": sorted(uncovered),
    }


def _collect_replication_signatures(repo_root: Path, source_files: list[str]) -> dict[str, Any]:
    signatures: dict[str, dict[str, Any]] = {}

    for rel_path in source_files:
        file_path = repo_root / rel_path
        if not file_path.exists():
            continue
        try:
            lines = file_path.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue

        for line_number, line in enumerate(lines, start=1):
            for pattern_id, pattern in REPLICATION_PATTERNS:
                if not pattern.search(line):
                    continue
                normalized = " ".join(line.strip().split())
                fingerprint = hashlib.sha256(f"{pattern_id}:{normalized}".encode("utf-8")).hexdigest()[:16]
                entry = signatures.setdefault(
                    fingerprint,
                    {
                        "fingerprint": fingerprint,
                        "pattern": pattern_id,
                        "count": 0,
                        "locations": [],
                    },
                )
                entry["count"] += 1
                entry["locations"].append(f"{rel_path}:{line_number}")

    repeated = [entry for entry in signatures.values() if entry["count"] > 1]
    repeated.sort(key=lambda item: (item["pattern"], item["fingerprint"]))
    for entry in repeated:
        entry["locations"] = sorted(entry["locations"])
    return {
        "repeated_signatures": repeated,
        "signature_count": len(signatures),
    }


def _hash_json(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def analyze_security_debt(
    *,
    repo_root: Path,
    output_dir: Path,
    gate_config_path: Path,
    base_ref: str | None = None,
) -> dict[str, Any]:
    resolved_repo_root = repo_root.resolve()
    resolved_output_dir = output_dir.resolve()
    gate_config = _load_gate_config(gate_config_path)
    resolved_base_ref = _resolve_base_ref(resolved_repo_root, base_ref)

    changed_files = _changed_files(resolved_repo_root, resolved_base_ref)
    source_files = sorted(path for path in changed_files if _is_source_file(path))

    classifications_path = resolved_repo_root / "docs/security/security-debt/dependency_risk_classifications.json"
    threat_map_path = resolved_repo_root / "docs/security/security-debt/threat_model_map.json"
    dependency_classifications = _load_dependency_classifications(classifications_path)
    added_dependencies = _collect_added_dependencies(resolved_repo_root, changed_files, resolved_base_ref)

    dependency_rows: list[dict[str, Any]] = []
    unclassified_dependencies: list[dict[str, Any]] = []
    for item in sorted(added_dependencies, key=lambda dep: (dep["dependency"], dep["file"])):
        metadata = dependency_classifications.get(item["dependency"], {"risk": "unknown", "rationale": ""})
        row = {
            "dependency": item["dependency"],
            "file": item["file"],
            "risk": metadata.get("risk", "unknown"),
            "rationale": metadata.get("rationale", ""),
            "classified": metadata.get("risk", "unknown") != "unknown",
        }
        dependency_rows.append(row)
        if not row["classified"]:
            unclassified_dependencies.append(row)

    provenance = _check_provenance_headers(
        resolved_repo_root,
        source_files,
        str(gate_config.get("provenance_header", DEFAULT_GATE_CONFIG["provenance_header"])),
    )

    threat_threshold = float(
        gate_config.get("threat_model_minimum_coverage", DEFAULT_GATE_CONFIG["threat_model_minimum_coverage"])
    )
    threat_map = _load_threat_map(threat_map_path)
    threat_model = _check_threat_model_coverage(source_files, threat_map, threat_threshold)

    replication = _collect_replication_signatures(resolved_repo_root, source_files)

    findings: list[dict[str, str]] = []
    if unclassified_dependencies:
        findings.append(
            {
                "code": "UNCLASSIFIED_DEPENDENCIES",
                "message": "New dependencies were added without risk classification.",
                "severity": "high",
            }
        )
    if provenance["missing_header_files"]:
        findings.append(
            {
                "code": "MISSING_AGENT_PROVENANCE_HEADER",
                "message": "Agent-authored files are missing the required provenance header.",
                "severity": "high",
            }
        )
    if threat_model["coverage_ratio"] < threat_model["threshold"]:
        findings.append(
            {
                "code": "THREAT_MODEL_COVERAGE_BELOW_THRESHOLD",
                "message": "Threat model coverage for changed source files is below the configured threshold.",
                "severity": "high",
            }
        )
    if gate_config.get("deny_on_repeated_signatures", True) and replication["repeated_signatures"]:
        findings.append(
            {
                "code": "REPEATED_VULNERABILITY_SIGNATURE",
                "message": "Repeated risky code signatures were detected in changed source files.",
                "severity": "medium",
            }
        )

    risk_score = (
        (len(unclassified_dependencies) * 5)
        + (len(provenance["missing_header_files"]) * 8)
        + int(max(0.0, threat_model["threshold"] - threat_model["coverage_ratio"]) * 100)
        + (len(replication["repeated_signatures"]) * 6)
    )

    ledger = {
        "base_ref": resolved_base_ref or "UNSET",
        "dependency_surface": {
            "added_dependencies": dependency_rows,
            "classification_source": str(classifications_path.relative_to(resolved_repo_root)),
            "unclassified_dependencies": unclassified_dependencies,
        },
        "deterministic": True,
        "enforcement_default": str(gate_config.get("enforcement_default", "off")).lower(),
        "findings": findings,
        "provenance": {
            "agent_files": provenance["agent_files"],
            "checked_files": provenance["checked_files"],
            "missing_header_files": provenance["missing_header_files"],
            "required_header": str(gate_config.get("provenance_header", DEFAULT_GATE_CONFIG["provenance_header"])),
        },
        "replication": replication,
        "risk_score": risk_score,
        "schema_version": "1.0",
        "threat_model": threat_model,
    }

    report = {
        "artifacts": [
            "report.json",
            "metrics.json",
            "stamp.json",
            "security_debt_ledger.json",
        ],
        "finding_count": len(findings),
        "findings": findings,
        "summary": "Deterministic security debt analysis for AI-assisted development.",
    }

    metrics = {
        "dependency_added_count": len(dependency_rows),
        "dependency_unclassified_count": len(unclassified_dependencies),
        "provenance_agent_file_count": len(provenance["agent_files"]),
        "provenance_missing_header_count": len(provenance["missing_header_files"]),
        "replication_repeated_count": len(replication["repeated_signatures"]),
        "replication_signature_count": int(replication["signature_count"]),
        "risk_score": int(risk_score),
        "threat_model_coverage": float(threat_model["coverage_ratio"]),
        "threat_model_threshold": float(threat_model["threshold"]),
    }

    ledger_hash = _hash_json(ledger)
    stamp = {
        "deterministic": True,
        "evidence_count": len(findings),
        "ledger_hash": ledger_hash,
    }

    _write_json(resolved_output_dir / "security_debt_ledger.json", ledger)
    _write_json(resolved_output_dir / "report.json", report)
    _write_json(resolved_output_dir / "metrics.json", metrics)
    _write_json(resolved_output_dir / "stamp.json", stamp)

    return {
        "findings": findings,
        "ledger_hash": ledger_hash,
        "output_dir": str(resolved_output_dir),
    }
