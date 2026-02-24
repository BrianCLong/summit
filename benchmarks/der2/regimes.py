from __future__ import annotations

import hashlib
import json
import os
import random
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Iterable, Sequence

REDACTION_TOKEN = "[REDACTED_TOOL_DIRECTIVE]"


class Regime(str, Enum):
    INSTRUCTION_ONLY = "instruction_only"
    CONCEPTS = "concepts"
    RELATED_ONLY = "related_only"
    FULL_SET = "full_set"


@dataclass(frozen=True)
class Document:
    doc_id: str
    title: str
    text: str


@dataclass(frozen=True)
class TaskInstance:
    task_id: str
    question: str
    expected_answer: str | None
    related_doc_ids: Sequence[str]
    novelty_required: bool


@dataclass(frozen=True)
class Concepts:
    task_id: str
    concepts: Sequence[str]
    rationale: str | None


@dataclass(frozen=True)
class EvidenceItem:
    evidence_id: str
    doc_id: str
    doc_hash: str


@dataclass(frozen=True)
class CompiledInstance:
    task_id: str
    regime: Regime
    prompt: str
    evidence: Sequence[EvidenceItem]
    selected_doc_ids: Sequence[str]
    concepts: Sequence[str]


@dataclass(frozen=True)
class Library:
    documents: Sequence[Document]

    def by_id(self) -> dict[str, Document]:
        return {doc.doc_id: doc for doc in self.documents}


@dataclass(frozen=True)
class Der2Config:
    bench_id: str
    distractor_count: int = 2
    no_tools_from_docs: bool = True


def _seed_from(bench_id: str, task_id: str) -> int:
    digest = hashlib.sha256(f"{bench_id}:{task_id}".encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _sanitize_document_text(text: str, enabled: bool) -> str:
    if not enabled:
        return text
    patterns = ["tool(", "run tool", "<tool>", "</tool>", "system:", "assistant:"]
    sanitized = text
    for pattern in patterns:
        sanitized = sanitized.replace(pattern, REDACTION_TOKEN)
    return sanitized


def load_library(frozen_library_dir: str | Path) -> Library:
    path = Path(frozen_library_dir) / "documents.jsonl"
    documents: list[Document] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            documents.append(
                Document(
                    doc_id=record["id"],
                    title=record.get("title", ""),
                    text=record.get("text", ""),
                )
            )
    documents.sort(key=lambda doc: doc.doc_id)
    return Library(documents=documents)


def load_tasks(tasks_path: str | Path) -> list[TaskInstance]:
    tasks: list[TaskInstance] = []
    with Path(tasks_path).open("r", encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            tasks.append(
                TaskInstance(
                    task_id=record["id"],
                    question=record["question"],
                    expected_answer=record.get("expected_answer"),
                    related_doc_ids=record.get("related_doc_ids", []),
                    novelty_required=record.get("novelty_required", False),
                )
            )
    return tasks


def load_concepts(concepts_path: str | Path) -> dict[str, Concepts]:
    concepts: dict[str, Concepts] = {}
    with Path(concepts_path).open("r", encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            concepts[record["task_id"]] = Concepts(
                task_id=record["task_id"],
                concepts=record.get("concepts", []),
                rationale=record.get("rationale"),
            )
    return concepts


def _select_distractors(
    task: TaskInstance, library: Library, config: Der2Config
) -> list[str]:
    rng = random.Random(_seed_from(config.bench_id, task.task_id))
    eligible = [doc.doc_id for doc in library.documents if doc.doc_id not in task.related_doc_ids]
    if not eligible or config.distractor_count <= 0:
        return []
    count = min(config.distractor_count, len(eligible))
    return rng.sample(eligible, count)


def _compile_prompt(
    task: TaskInstance,
    regime: Regime,
    library: Library,
    config: Der2Config,
    concepts_map: dict[str, Concepts],
) -> tuple[str, list[EvidenceItem], list[str], list[str]]:
    prompt_parts: list[str] = [f"Question: {task.question}"]
    evidence: list[EvidenceItem] = []
    selected_docs: list[str] = []
    selected_concepts: list[str] = []

    if regime in {Regime.CONCEPTS, Regime.FULL_SET}:
        concept_entry = concepts_map.get(task.task_id)
        if concept_entry:
            selected_concepts = list(concept_entry.concepts)
            prompt_parts.append("Concepts:")
            prompt_parts.extend([f"- {concept}" for concept in selected_concepts])

    if regime in {Regime.RELATED_ONLY, Regime.FULL_SET}:
        selected_docs = list(task.related_doc_ids)

    if regime is Regime.FULL_SET:
        selected_docs.extend(_select_distractors(task, library, config))

    if selected_docs:
        doc_map = library.by_id()
        prompt_parts.append("Documents:")
        for doc_id in selected_docs:
            doc = doc_map[doc_id]
            sanitized_text = _sanitize_document_text(doc.text, config.no_tools_from_docs)
            prompt_parts.append(f"[{doc.doc_id}] {doc.title}\n{sanitized_text}")
            evidence.append(
                EvidenceItem(
                    evidence_id=f"DER2:{config.bench_id}:{task.task_id}:{doc.doc_id}:full",
                    doc_id=doc.doc_id,
                    doc_hash=_hash_text(doc.text),
                )
            )

    prompt_parts.append("Answer concisely and cite evidence IDs when used.")
    return "\n\n".join(prompt_parts), evidence, selected_docs, selected_concepts


def compile_instance(
    task: TaskInstance,
    regime: Regime,
    library: Library,
    concepts_map: dict[str, Concepts],
    config: Der2Config,
) -> CompiledInstance:
    prompt, evidence, selected_docs, selected_concepts = _compile_prompt(
        task, regime, library, config, concepts_map
    )
    return CompiledInstance(
        task_id=task.task_id,
        regime=regime,
        prompt=prompt,
        evidence=evidence,
        selected_doc_ids=selected_docs,
        concepts=selected_concepts,
    )


def ensure_env_guard(no_tools_from_docs: bool) -> None:
    if no_tools_from_docs:
        os.environ.setdefault("DER2_NO_TOOLS_FROM_DOCS", "1")
    os.environ.setdefault("DER2_NEVER_LOG_DOC_TEXT", "1")
    os.environ.setdefault("DER2_NETWORK_DISABLED", "1")


def iter_regimes(regimes: Iterable[str]) -> list[Regime]:
    return [Regime(regime) for regime in regimes]
