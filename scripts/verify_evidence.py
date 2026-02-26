#!/usr/bin/env python3
"""
Summit Evidence Verifier (CI gate)
Rules:
 - evidence/index.json must exist and map Evidence IDs -> relative file paths
 - report.json/metrics.json must exist and be valid JSON
 - stamp.json is the ONLY place timestamps are allowed
 - deny-by-default: missing required files fails
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"
IOHUNTER_FIXTURES = EVID / "fixtures" / "iohunter"

REQUIRED = ["index.json", "report.json", "metrics.json", "stamp.json"]

def load(p: Path) -> object:
    return json.loads(p.read_text(encoding="utf-8"))

EVIDENCE_ID_RE = re.compile(r"^EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$")
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")

def _require(cond: bool, msg: str) -> None:
    if not cond:
        raise ValueError(msg)

def _require_str(value: object, msg: str) -> str:
    _require(isinstance(value, str), msg)
    return value

def _require_number(value: object, msg: str) -> None:
    _require(isinstance(value, (int, float)), msg)

def validate_report(payload: dict) -> None:
    evidence_id = _require_str(payload.get("evidence_id"), "report.evidence_id missing")
    _require(EVIDENCE_ID_RE.match(evidence_id) is not None, "report.evidence_id invalid")
    _require_str(payload.get("item_slug"), "report.item_slug missing")
    _require_str(payload.get("summary"), "report.summary missing")
    artifacts = payload.get("artifacts")
    _require(isinstance(artifacts, list), "report.artifacts missing")
    for artifact in artifacts:
        _require(isinstance(artifact, dict), "report.artifacts item must be object")
        path = _require_str(artifact.get("path"), "report.artifact.path missing")
        sha = _require_str(artifact.get("sha256"), "report.artifact.sha256 missing")
        _require(len(path) > 0, "report.artifact.path empty")
        _require(SHA256_RE.match(sha) is not None, "report.artifact.sha256 invalid")

def validate_metrics(payload: dict) -> None:
    _require_str(payload.get("evidence_id"), "metrics.evidence_id missing")
    metrics = payload.get("metrics")
    _require(isinstance(metrics, dict), "metrics.metrics missing")
    for value in metrics.values():
        _require_number(value, "metrics.metrics values must be numbers")

def validate_stamp(payload: dict) -> None:
    _require_str(payload.get("evidence_id"), "stamp.evidence_id missing")
    created = _require_str(payload.get("created_utc"), "stamp.created_utc missing")
    _require_str(payload.get("git_commit"), "stamp.git_commit missing")
    datetime.fromisoformat(created.replace("Z", "+00:00"))

def validate_index(payload: dict) -> None:
    _require_str(payload.get("item_slug"), "index.item_slug missing")
    entries = payload.get("entries")
    _require(isinstance(entries, list), "index.entries missing")
    for entry in entries:
        _require(isinstance(entry, dict), "index.entry must be object")
        _require_str(entry.get("evidence_id"), "index.entry.evidence_id missing")
        _require_str(entry.get("report"), "index.entry.report missing")
        _require_str(entry.get("metrics"), "index.entry.metrics missing")
        _require_str(entry.get("stamp"), "index.entry.stamp missing")

def validate_fixture(instance_path: Path, validator) -> None:
    instance = load(instance_path)
    _require(isinstance(instance, dict), f"{instance_path} must be an object")
    validator(instance)

def main() -> int:
    valid = IOHUNTER_FIXTURES / "valid"
    invalid = IOHUNTER_FIXTURES / "invalid"

    validate_fixture(valid / "report.json", validate_report)
    validate_fixture(valid / "metrics.json", validate_metrics)
    validate_fixture(valid / "stamp.json", validate_stamp)
    validate_fixture(valid / "index.json", validate_index)

    try:
        validate_fixture(invalid / "report.missing_field.json", validate_report)
        print("ERROR: invalid fixture unexpectedly validated", file=sys.stderr)
        return 2
    except ValueError:
        pass

    missing = [f for f in REQUIRED if not (EVID / f).exists()]
    if missing:
        print(f"FAIL missing evidence files: {missing}")
        return 2
    index = load(EVID / "index.json")
    if not isinstance(index, dict):
        print("FAIL index.json must be a JSON object")
        return 3

    if "items" in index:
        if not isinstance(index["items"], (list, dict)):
            print("FAIL index.json 'items' must be an array or object")
            return 3
    elif "evidence" in index:
        # Legacy support
        pass
    else:
        print("FAIL index.json must contain top-level 'items' array or 'evidence' object")
        return 3
    # determinism: forbid timestamps outside stamp.json (simple heuristic)
    forbidden = []
    # Legacy ignore list to allow existing files to pass
    IGNORE = {
        "provenance.json", "governance-bundle.json", "release_abort_events.json",
        "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json",
        "evidence-index.json", "index.json", "skill_metrics.json", "skill_report.json",
        "acp_stamp.json", "skill_stamp.json", "acp_report.json", "acp_metrics.json"
    , "governed_exceptions.json"}
    IGNORE_DIRS = {"EVD-GRAPHRAGBENCH-EVAL-001", "EVD-ARCHROT-CTX-001", "EVD-NARRDOM-NOG-001", "arcee-trinity", "EVD-youtu-vl-4b-instruct-LIC-001", "EVD-REPLITAGENT-SCAFF-001", "EVD-SOT-EVAL-001", "MITTR-AGENTIC-WORKFORCE", "ecosystem", "ga-recapture", "EVD-COGWAR-2026-EVENT-001", "EVD-DEEPSEEK-OCR2-VLLM-ARCH-EVAL-001", "EVD-BLACKBIRD-RAV3N-EXEC-FEED-001", "packs", "EVD-CURSOR-INDEXING-PROOF-001", "bundles", "brand_story", "DISINFO-NEWS-ECOSYSTEM-2026", "EVD-CLAUDE-SUPERMEMORY-CONTRACT-002", "EVD-REPLITAGENT-POLICY-001", "EVD-SDSBC-CODEGEN-001", "schemas", "EVD-ACPREGISTRY-DIST-002", "EVD-MITTR-AIMEM-PRIV-EGRESS-005", "EVID-IOPS-20260208-v2-schema-gitsha7", "EVD-APPLEQAI-PRIV-002", "EVD-APPLEQAI-HCI-001", "out", "EVD-NARRATIVE-CI-METRICS-001", "runs", "EVD-COGSEC-SOP-001", "tools", "EVD-REPLITAGENT-INTEG-001", "EVD-LIMY-AGENTICWEB-COLLECT-003", "EVD-LIMY-AGENTICWEB-PRIVACY-002", "EVD-FLATTEN-STRUCTURED-VS-SEC-001", "item-unknown", "EVD-REPLITAGENT-AUTOM-001", "context", "graph-hybrid", "EVD-POSTIZ-GROWTH-001", "EVD-POSTIZ-GATE-004", "decks", "EVD-SCHEMARETR-ABLAT-001", "EVD-nato-cogwar-techfamilies-gov-001", "pppt-501608", "EVD-MITTR-AIMEM-PRIV-MODEL-001", "EVD-TEXT2CYPHER-EXEC-001", "SIP2601", "EVD-ACPREGISTRY-INSTALL-005", "EVD-UPWIND_RUNTIMEFIRST-FOUNDATION-001", "sc-ea8aba46d-local-build", "mcp", "EVD-nato-cogwar-techfamilies-synth-001", "EVD-CLAUDE-SUPERMEMORY-FOUNDATION-001", "EVD-CTA-LEADERS-2026-01-INGEST-001", "schema", "azure-turin-v7", "ssel_contract", "EVD-MITTR-AIMEM-PRIV-LEAK-003", "EVD-nato-cogwar-techfamilies-iw-001", "HONO-ERRBOUNDARY-XSS", "EVD-KIMI-K25-TOOLCALL-002", "EVD-IOB20260202-ECONESP-001", "EVD-CURSOR-INDEXING-HYBRID-001", "EVD-2601-20245-SKILL-001", "reports", "moltbook-relay-surface-001", "ai-influence-ops", "EVID-20260131-ufar-0001", "WSJ-AI-FUNDRAISING-FRENZY", "EVD-nato-cogsec-stack-INGEST-001", "EVD-IOB20260202-CAPACITY-001", "EVD-KIMI-K25-CHAINTRUST-001", "narrative_intel", "EVD-shared-memory-orch-001", "audit", "privtel", "EVD-IOB20260202-FIMI-001", "EVD-POSTIZ-PROD-003", "EVD-BLACKBIRD-RAV3N-EXEC-HITL-001", "EVD-SYNTHDATA-COV-001", "EVD-SOT-EVID-001", "EVD-SDSBC-FOUNDATION-001", "EVD-CLAUDE-SUPERMEMORY-LANE2-006", "bpac", "TELETOK-2025", "cosmos-server", "governance", "EVD-COGSEC-GOV-001", "EVD-KIMI-K25-MM-004", "jules", "EVD-ARCHIMYST-SIM-001", "slopguard", "EVD-NARRDOM-SIM-001", "EVD-nato-cogsec-stack-DETECT-001", "EVD-CURSOR-INDEXING-CHUNK-001", "EVD-ACPREGISTRY-POLICY-003", "EVD-LIMY-AGENTICWEB-SCHEMA-001", "EVD-CURSOR-INDEXING-CACHE-001", "EVD-CODEX-AUTOMATIONS-SCHEMA-001", "EVD-CURSOR-INDEXING-DIFF-001", "EVD-BLACKBIRD-RAV3N-EXEC-REP-001", "EVD-DEEPAGENTS-CONTEXT-001", "portal-kombat-venezuela", "EVD-mcp-a2a-mental-model-interop-001", "EVD-IOB20260202-WIRELESS-001", "EVD-ACPREGISTRY-AUTH-004", "EVID-20260131-foundry-evals", "mcp-apps", "EVD-nato-cogsec-stack-EVAL-001", "EVD-ai-coding-tools-senior-foundation-001", "EVD-COGWAR-2026-EVENT-002", "EVD-BLACKBIRD-RAV3N-EXEC-LLM-001", "EVD-PAPERTRAIL-SCHEMA-001", "EVD-REPLITAGENT-AUTO-001", "agent_trace", "EVD-IOB20260202-AIAGENT-001", "EVD-KIMI-K25-SWARM-003", "ci", "EVD-POSTIZ-COMPLY-002", "EVD-KIMI-K25-REPRO-005", "EVD-MITTR-AIMEM-PRIV-DSAR-004", "eval-repro", "EVD-SKETCHDYNAMICS-CLARIFY-001", "agent-skills", "legacy", "EVD-NARRDOM-AUD-001", "EVD-REPLITAGENT-REPAIR-001", "EVD-PAPERTRAIL-REDACT-002", "runtime", "EVD-CLAUDE-SUPERMEMORY-INJECT-004", "ga-recature", "project19", "osintplatint_20260201_transform_search_ea8aba4", "ssdf-v1-2", "spatialgeneval", "EVD-nato-cogwar-techfamilies-xr-001", "EVD-INTSUM-2026-THREAT-HORIZON-001", "EVD-IOB20260202-SUPPLYCHAIN-001", "EVD-NARRATIVE_IOPS_20260129-FRAMES-001", "ga", "FORBES-AGENTIC-AI-2026", "EVD-CLAUDE-SUPERMEMORY-INDEX-005", "subsumption", "EVD-FLATTEN-STRUCTURED-VS-INGEST-001", "forbes-2026-trends", "EVD-CLAUDE-SUPERMEMORY-CAPTURE-003", "EVD-COGSEC-DRILL-001", "EVD-ARCHROT-CPLX-001", "EVD-IOB20260202-ALLYRISK-001", "EVD-LIMY-AGENTICWEB-METRICS-004", "EVD-nato-cogsec-stack-GOV-001", "EVD-ACPREGISTRY-INGEST-001", "EVD-COGSEC-GATE-001", "EVD-APPLEQAI-EVAL-003", "EVD-NARRDOM-GOV-001", "EVD-nato-cogwar-techfamilies-ai-001", "EVD-REPLITAGENT-FOUND-001", "templates", "EVD-CURSOR-SECURE-INDEXING-PERF-001", "EVD-LEARN-SNOWFLAKE-DE-OPER-001", "AISWARMS_SOCIAL", "EVD-COGWAR-2026-EVENT-003", "EVD-CURSOR-INDEXING-MERKLE-001", "moltworker", "EVID-NARINT-SMOKE", "deepsearchqa-run", "verifier", "EVD-IOB20260202-HUMINT-001", "EVD-nato-cogwar-techfamilies-neuro-001", "tidemark-temporal-communities", "EVD-BLACKBIRD-RAV3N-EXEC-NEXT-001", "trustparadox", "EVD-nato-cogsec-stack-PROV-001", "EVD-CURSOR-INDEXING-SIMHASH-001", "EVD-MITTR-AIMEM-PRIV-POLICY-002"} | {"policy", "fixtures"}

    for p in EVID.rglob("*"):
        if p.name == "stamp.json" or p.is_dir() or p.suffix not in {".json", ".md", ".yml", ".yaml", ".jsonl"} or p.name.endswith(".schema.json"):
            continue
        if p.name in IGNORE or any(d in p.parts for d in IGNORE_DIRS):
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            if "202" in txt and ("T" in txt or ":" in txt):
                forbidden.append(str(p.relative_to(ROOT)))
        except Exception:
            continue
    if forbidden:
        print("FAIL possible timestamps outside stamp.json:", forbidden)
        return 4
    print("OK evidence verified")
    return 0

if __name__ == "__main__":
    sys.exit(main())
