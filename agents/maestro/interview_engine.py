"""Deterministic interview-to-spec compiler for maestro_spec_interview_v1."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

REQUIRED_SECTIONS = [
    "functional_requirements",
    "non_functional_requirements",
    "data_model",
    "agent_design",
    "interfaces",
    "risk_analysis",
    "acceptance_criteria",
]

SECTION_PREFIX = {
    "functional_requirements": "FR",
    "non_functional_requirements": "NFR",
    "data_model": "DM",
    "agent_design": "AD",
    "interfaces": "IF",
    "risk_analysis": "RA",
    "acceptance_criteria": "AC",
}

AMBIGUITY_MARKERS = (
    "approximately",
    "as needed",
    "etc",
    "maybe",
    "tbd",
    "to be decided",
    "todo",
)

UNKNOWN_MARKERS = (
    "deferred",
    "not decided",
    "pending",
    "unknown",
    "unsure",
)

RISK_MARKERS = (
    "admin",
    "credential",
    "pii",
    "private",
    "production",
    "root",
    "secret",
    "token",
)

MUST_PATTERN = re.compile(
    r"^(?P<subject>.+?)\s+must(?P<neg>\s+not)?\s+(?P<rest>.+)$", re.IGNORECASE
)


@dataclass(frozen=True)
class FlagSet:
    ambiguous: bool
    unknown: bool
    risk: bool


def _normalize_space(text: str) -> str:
    return " ".join(text.strip().split())


def _validate_required_sections(payload: dict[str, Any]) -> None:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in payload]
    if missing_sections:
        joined = ", ".join(missing_sections)
        raise ValueError(f"Missing required sections: {joined}")

    summaries = payload.get("section_summaries")
    if not isinstance(summaries, dict):
        raise ValueError("section_summaries must be an object containing all required sections")

    missing_summaries = [section for section in REQUIRED_SECTIONS if not summaries.get(section)]
    if missing_summaries:
        joined = ", ".join(missing_summaries)
        raise ValueError(f"Missing required section summaries: {joined}")


def _as_string_list(payload: dict[str, Any], key: str) -> list[str]:
    raw = payload.get(key)
    if not isinstance(raw, list) or not raw:
        raise ValueError(f"{key} must be a non-empty array")
    values = []
    for value in raw:
        if not isinstance(value, str):
            raise ValueError(f"{key} entries must be strings")
        normalized = _normalize_space(value)
        if not normalized:
            raise ValueError(f"{key} entries must not be empty")
        values.append(normalized)
    return values


def _flags_for_text(text: str) -> FlagSet:
    lower = text.lower()
    return FlagSet(
        ambiguous=any(marker in lower for marker in AMBIGUITY_MARKERS),
        unknown=any(marker in lower for marker in UNKNOWN_MARKERS),
        risk=any(marker in lower for marker in RISK_MARKERS),
    )


def _extract_subject(text: str) -> tuple[str, bool] | None:
    normalized = _normalize_space(text)
    match = MUST_PATTERN.match(normalized)
    if not match:
        return None

    subject = match.group("subject").lower()
    subject = re.sub(r"[^a-z0-9\s]", "", subject)
    subject = _normalize_space(subject)
    if not subject:
        return None

    subject_tokens = subject.split(" ")[:8]
    return (" ".join(subject_tokens), bool(match.group("neg")))


def _build_requirements(payload: dict[str, Any]) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    section_requirements: dict[str, list[dict[str, Any]]] = {}
    requirement_index: list[dict[str, Any]] = []

    for section in REQUIRED_SECTIONS:
        entries = _as_string_list(payload, section)
        prefix = SECTION_PREFIX[section]
        section_items: list[dict[str, Any]] = []
        for idx, text in enumerate(entries, start=1):
            req_id = f"REQ-{prefix}-{idx:03d}"
            flags = _flags_for_text(text)
            item = {
                "id": req_id,
                "text": text,
                "section": section,
                "flags": {
                    "ambiguous": flags.ambiguous,
                    "unknown": flags.unknown,
                    "risk": flags.risk,
                },
            }
            section_items.append(item)
            requirement_index.append(item)
        section_requirements[section] = section_items

    return section_requirements, requirement_index


def _detect_contradictions(requirement_index: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_subject: dict[str, dict[str, Any]] = {}
    contradictions: list[dict[str, Any]] = []

    for item in requirement_index:
        parsed = _extract_subject(item["text"])
        if not parsed:
            continue
        subject, is_negative = parsed

        seen = by_subject.get(subject)
        if seen and seen["is_negative"] != is_negative:
            contradictions.append(
                {
                    "type": "subject_polarity_conflict",
                    "subject": subject,
                    "requirements": [seen["requirement_id"], item["id"]],
                    "message": "Conflicting MUST and MUST NOT statements detected.",
                }
            )
            continue

        by_subject[subject] = {"is_negative": is_negative, "requirement_id": item["id"]}

    contradictions.sort(key=lambda entry: (entry["subject"], entry["requirements"]))
    return contradictions


def _build_open_questions(
    payload: dict[str, Any],
    requirement_index: list[dict[str, Any]],
    contradictions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    for requirement in requirement_index:
        req_flags = requirement["flags"]
        if req_flags["ambiguous"]:
            items.append(
                {
                    "question": f"Clarify requirement {requirement['id']} wording.",
                    "source": requirement["id"],
                    "blocking": False,
                }
            )
        if req_flags["unknown"]:
            items.append(
                {
                    "question": f"Resolve unknown details in {requirement['id']}.",
                    "source": requirement["id"],
                    "blocking": True,
                }
            )

    for conflict in contradictions:
        joined = ", ".join(conflict["requirements"])
        items.append(
            {
                "question": f"Resolve contradiction for subject '{conflict['subject']}' across {joined}.",
                "source": "contradiction_check",
                "blocking": True,
            }
        )

    explicit_questions = payload.get("open_questions", [])
    if explicit_questions:
        if not isinstance(explicit_questions, list):
            raise ValueError("open_questions must be an array of strings")
        for question in explicit_questions:
            if not isinstance(question, str):
                raise ValueError("open_questions entries must be strings")
            normalized = _normalize_space(question)
            if normalized:
                items.append(
                    {
                        "question": normalized,
                        "source": "user_input",
                        "blocking": False,
                    }
                )

    de_duplicated: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        dedupe_key = f"{item['question']}::{item['source']}::{item['blocking']}"
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        de_duplicated.append(item)

    for idx, item in enumerate(de_duplicated, start=1):
        item["id"] = f"Q-{idx:03d}"

    return de_duplicated


def _build_jules_tasks(section_requirements: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    section_titles = {
        "functional_requirements": "Functional Scope Slice",
        "non_functional_requirements": "Non-Functional Constraints Slice",
        "data_model": "Data Model Slice",
        "agent_design": "Agent Design Slice",
        "interfaces": "Interface Contract Slice",
        "risk_analysis": "Risk Mitigation Slice",
        "acceptance_criteria": "Acceptance Criteria Slice",
    }

    tasks: list[dict[str, Any]] = []
    for section in REQUIRED_SECTIONS:
        requirements = section_requirements[section]
        requirement_ids = [item["id"] for item in requirements]
        tasks.append(
            {
                "id": f"JULES-TASK-{len(tasks) + 1:03d}",
                "title": section_titles[section],
                "section": section,
                "requirement_ids": requirement_ids,
                "description": f"Plan atomic PRs for {len(requirement_ids)} requirement(s) in {section}.",
            }
        )

    return tasks


def _module_hint(section: str) -> str:
    return {
        "functional_requirements": "server/",
        "non_functional_requirements": "packages/",
        "data_model": "schemas/",
        "agent_design": "agents/",
        "interfaces": "server/",
        "risk_analysis": "docs/security/",
        "acceptance_criteria": "tests/",
    }[section]


def _build_codex_tasks(requirement_index: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for item in requirement_index:
        tasks.append(
            {
                "id": f"CODEX-TASK-{len(tasks) + 1:03d}",
                "requirement_id": item["id"],
                "title": f"Implement {item['id']}",
                "module_hint": _module_hint(item["section"]),
                "description": item["text"],
            }
        )
    return tasks


def _build_dod_scorecard(
    section_requirements: dict[str, list[dict[str, Any]]],
    requirement_index: list[dict[str, Any]],
    contradictions: list[dict[str, Any]],
) -> dict[str, Any]:
    total_requirements = len(requirement_index)
    unique_ids = len({item["id"] for item in requirement_index})
    risk_count = sum(1 for item in requirement_index if item["flags"]["risk"])

    scores = {
        "determinism": 5,
        "machine_verifiability": 5 if unique_ids == total_requirements else 2,
        "mergeability": 5 if not contradictions else 2,
        "security_posture": max(2, 5 - min(3, risk_count)),
        "measured_advantage": 5 if len(section_requirements["acceptance_criteria"]) >= 3 else 3,
    }

    total = sum(scores.values())
    return {
        "scores": scores,
        "total": total,
        "passing_threshold": 20,
        "passing": total >= 20,
    }


def build_spec_bundle(payload: dict[str, Any]) -> dict[str, Any]:
    """Compile interview payload into deterministic spec bundle."""

    _validate_required_sections(payload)

    mode = payload.get("mode", "standard")
    if mode not in {"standard", "adversarial", "mvs", "compliance"}:
        raise ValueError("mode must be one of: standard, adversarial, mvs, compliance")

    section_requirements, requirement_index = _build_requirements(payload)
    contradictions = _detect_contradictions(requirement_index)
    open_questions = _build_open_questions(payload, requirement_index, contradictions)
    jules_tasks = _build_jules_tasks(section_requirements)
    codex_tasks = _build_codex_tasks(requirement_index)
    scorecard = _build_dod_scorecard(section_requirements, requirement_index, contradictions)

    bundle = {
        "spec_version": str(payload.get("spec_version", "1.0")),
        "mode": mode,
        "title": payload.get("title", "maestro_spec_interview_v1"),
        "scope": _normalize_space(str(payload.get("scope", ""))),
        "section_summaries": {
            key: _normalize_space(str(payload["section_summaries"][key]))
            for key in REQUIRED_SECTIONS
        },
        "functional_requirements": section_requirements["functional_requirements"],
        "non_functional_requirements": section_requirements["non_functional_requirements"],
        "data_model": section_requirements["data_model"],
        "agent_design": section_requirements["agent_design"],
        "interfaces": section_requirements["interfaces"],
        "risk_analysis": section_requirements["risk_analysis"],
        "acceptance_criteria": section_requirements["acceptance_criteria"],
        "open_questions": open_questions,
        "jules_tasks": jules_tasks,
        "codex_tasks": codex_tasks,
        "diagnostics": {
            "contradictions": contradictions,
            "ambiguity_hits": [
                item["id"] for item in requirement_index if item["flags"]["ambiguous"]
            ],
            "unknown_hits": [
                item["id"] for item in requirement_index if item["flags"]["unknown"]
            ],
        },
        "definition_of_done": scorecard,
        "requirement_index": requirement_index,
    }

    if not bundle["scope"]:
        raise ValueError("scope must not be empty")

    return bundle
