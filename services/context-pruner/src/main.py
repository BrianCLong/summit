"""
Summit Context Pruner Service.

Scores token relevance, aggregates to sentence/clause scores, extracts spans, and prunes with
budget-aware packing. Designed to integrate with Summit RAG pipelines.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("context-pruner")
logging.basicConfig(level=logging.INFO)


SUPPORTED_GRANULARITIES = {"sentence", "clause", "span"}
DEFAULT_MODEL_ID = "zilliz/semantic-highlight-bilingual-v1"
DEFAULT_MODEL_REVISION = "6dfd9cbee6d9309201b4ff4b4bdd814e1c064491"
DEFAULT_ALLOWLIST = {DEFAULT_MODEL_ID}


class DocumentContext(BaseModel):
    doc_id: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class HighlightRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    context: str | None = None
    documents: list[DocumentContext] | None = None
    language: str | None = None
    threshold: float | None = Field(default=None, ge=0, le=1)
    budget: int | None = Field(default=None, ge=1)
    granularity: Literal["sentence", "clause", "span"] = "sentence"
    return_metrics: bool = True
    subquestions: list[str] | None = None
    keep_at_least_sentences: int | None = Field(default=None, ge=1)
    keep_at_least_sources: int | None = Field(default=None, ge=1)
    strict_mode: bool = False
    detect_contradictions: bool = True


class SelectedSpan(BaseModel):
    doc_id: str
    start: int
    end: int
    text: str
    score: float
    token_count: int
    sentence_index: int | None = None
    conflict_set_id: str | None = None


class SelectedSentence(BaseModel):
    doc_id: str
    index: int
    start: int
    end: int
    text: str
    score: float
    token_count: int
    conflict_set_id: str | None = None


class SentenceScore(BaseModel):
    doc_id: str
    index: int
    start: int
    end: int
    text: str
    score: float
    token_count: int


class ConflictSet(BaseModel):
    id: str
    member_indices: list[int]
    rationale: str


class HighlightResponse(BaseModel):
    selected_spans: list[SelectedSpan]
    selected_sentences: list[SelectedSentence]
    sentence_scores: list[SentenceScore]
    token_scores: list[float] | None
    compression_rate: float
    kept_token_count: int
    total_token_count: int
    model_version: str
    timings_ms: dict[str, float]
    conflict_sets: list[ConflictSet]


@dataclass
class Token:
    text: str
    start: int
    end: int


def tokenize(text: str) -> list[Token]:
    pattern = re.compile(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]", re.UNICODE)
    tokens = []
    for match in pattern.finditer(text):
        tokens.append(Token(match.group(), match.start(), match.end()))
    return tokens


def normalize_token(token: str) -> str:
    return re.sub(r"\W+", "", token).lower()


def split_sentences(text: str) -> list[tuple[int, int]]:
    boundaries = []
    start = 0
    for match in re.finditer(r"[.!?。！？]", text):
        end = match.end()
        if end > start:
            boundaries.append((start, end))
            start = end
    if start < len(text):
        boundaries.append((start, len(text)))
    return boundaries


def split_clauses(text: str) -> list[tuple[int, int]]:
    boundaries = []
    start = 0
    for match in re.finditer(r"[,;:，；：]", text):
        end = match.end()
        if end > start:
            boundaries.append((start, end))
            start = end
    if start < len(text):
        boundaries.append((start, len(text)))
    return boundaries


def hash_payload(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def detect_conflicts(sentences: list[SentenceScore]) -> list[ConflictSet]:
    conflict_sets: list[ConflictSet] = []
    indexed = {s.index: s for s in sentences}
    if not indexed:
        return conflict_sets
    for sentence in sentences:
        text_lower = sentence.text.lower()
        if " not " in text_lower or "no " in text_lower or "never" in text_lower:
            for other in sentences:
                if other.index == sentence.index:
                    continue
                if other.text.lower() in text_lower or text_lower in other.text.lower():
                    conflict_sets.append(
                        ConflictSet(
                            id=f"conflict-{sentence.index}-{other.index}",
                            member_indices=[sentence.index, other.index],
                            rationale="Potential negation conflict",
                        )
                    )
    return conflict_sets


class SimpleCache:
    def __init__(self, ttl_seconds: int | None) -> None:
        self.ttl_seconds = ttl_seconds
        self.store: dict[str, tuple[float, HighlightResponse]] = {}

    def get(self, key: str) -> HighlightResponse | None:
        if self.ttl_seconds is None:
            return None
        entry = self.store.get(key)
        if not entry:
            return None
        timestamp, value = entry
        if time.time() - timestamp > self.ttl_seconds:
            self.store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: HighlightResponse) -> None:
        if self.ttl_seconds is None:
            return
        self.store[key] = (time.time(), value)


class BaseHighlighter:
    def score_tokens(
        self,
        query: str,
        text: str,
        subquestions: list[str] | None,
        language: str | None,
    ) -> list[float]:
        raise NotImplementedError


class MockHighlighter(BaseHighlighter):
    def score_tokens(
        self,
        query: str,
        text: str,
        subquestions: list[str] | None,
        language: str | None,
    ) -> list[float]:
        tokens = tokenize(text)
        query_tokens = {normalize_token(tok.text) for tok in tokenize(query)}
        sub_tokens: list[set[str]] = []
        if subquestions:
            for sub in subquestions:
                sub_tokens.append({normalize_token(tok.text) for tok in tokenize(sub)})
        scores = []
        for token in tokens:
            normalized = normalize_token(token.text)
            score = 0.0
            if normalized and normalized in query_tokens:
                score = 0.9
            if sub_tokens and normalized:
                score = max(score, max((0.8 if normalized in s else 0.0) for s in sub_tokens))
            scores.append(score)
        return scores


class TransformersHighlighter(BaseHighlighter):
    def __init__(self, model_id: str, revision: str, trust_remote_code: bool) -> None:
        try:
            from transformers import AutoModelForTokenClassification, AutoTokenizer
        except ImportError as exc:
            raise RuntimeError("transformers not installed; install to enable model mode") from exc

        self.tokenizer = AutoTokenizer.from_pretrained(
            model_id,
            revision=revision,
            trust_remote_code=trust_remote_code,
        )
        self.model = AutoModelForTokenClassification.from_pretrained(
            model_id,
            revision=revision,
            trust_remote_code=trust_remote_code,
        )
        self.model.eval()

    def score_tokens(
        self,
        query: str,
        text: str,
        subquestions: list[str] | None,
        language: str | None,
    ) -> list[float]:
        import numpy as np
        import torch

        if subquestions:
            query = " \n".join([query, *subquestions])

        if hasattr(self.model, "process"):
            try:
                output = self.model.process(
                    question=query,
                    context=text,
                    threshold=0.0,
                    language=language,
                    return_sentence_metrics=True,
                )
                sentence_scores = output.get("sentence_scores") or output.get("sentence_probs")
                if sentence_scores:
                    tokens = tokenize(text)
                    return [float(sentence_scores[0]) for _ in tokens]
            except Exception as exc:
                logger.warning("model.process failed; falling back to logits", exc_info=exc)

        inputs = self.tokenizer(query, text, return_tensors="pt", truncation=True)
        with torch.no_grad():
            outputs = self.model(**inputs)
        logits = outputs.logits.squeeze(0).cpu().numpy()
        probs = np.exp(logits) / np.exp(logits).sum(axis=-1, keepdims=True)
        relevant_probs = probs[:, -1]
        tokens = inputs["input_ids"].shape[1]
        relevant_probs = relevant_probs[:tokens]
        return relevant_probs.tolist()


class HighlighterFactory:
    def __init__(self) -> None:
        self.mode = os.getenv("CONTEXT_PRUNER_MODE", "mock")
        self.model_id = os.getenv("CONTEXT_PRUNER_MODEL_ID", DEFAULT_MODEL_ID)
        self.revision = os.getenv("CONTEXT_PRUNER_MODEL_REVISION", DEFAULT_MODEL_REVISION)
        self.trust_remote_code = os.getenv("CONTEXT_PRUNER_TRUST_REMOTE_CODE", "false").lower() == "true"
        allowlist_env = os.getenv("CONTEXT_PRUNER_ALLOWLIST")
        self.allowlist = DEFAULT_ALLOWLIST if not allowlist_env else {m.strip() for m in allowlist_env.split(",")}

    def build(self) -> BaseHighlighter:
        if self.model_id not in self.allowlist:
            raise RuntimeError(f"Model {self.model_id} not allowlisted")
        if self.mode == "model":
            return TransformersHighlighter(
                self.model_id,
                revision=self.revision,
                trust_remote_code=self.trust_remote_code,
            )
        return MockHighlighter()


cache = SimpleCache(
    ttl_seconds=int(os.getenv("CONTEXT_PRUNER_CACHE_TTL_SECONDS", "0")) or None
)

app = FastAPI(
    title="Summit Context Pruner",
    version="0.1.0",
)


@app.post("/highlight", response_model=HighlightResponse)
async def highlight(request: HighlightRequest) -> HighlightResponse:
    if request.granularity not in SUPPORTED_GRANULARITIES:
        raise HTTPException(status_code=400, detail="Unsupported granularity")

    documents = request.documents or []
    if request.context:
        documents = [DocumentContext(doc_id="context", text=request.context)] + documents
    if not documents:
        raise HTTPException(status_code=400, detail="No context provided")

    payload_hash = hash_payload(
        f"{request.query}|{request.language}|{request.threshold}|{request.budget}|{request.granularity}|"
        f"{request.subquestions}|{request.keep_at_least_sentences}|{request.keep_at_least_sources}|{request.strict_mode}|"
        f"{request.detect_contradictions}|{','.join(doc.doc_id for doc in documents)}"
    )
    cached = cache.get(payload_hash)
    if cached:
        return cached

    start_time = time.perf_counter()
    highlighter = HighlighterFactory().build()

    sentence_scores: list[SentenceScore] = []
    selected_sentences: list[SelectedSentence] = []
    selected_spans: list[SelectedSpan] = []
    conflict_sets: list[ConflictSet] = []
    all_token_scores: list[float] = []
    total_tokens = 0

    for doc in documents:
        doc_tokens = tokenize(doc.text)
        total_tokens += len(doc_tokens)
        token_scores = highlighter.score_tokens(
            request.query,
            doc.text,
            request.subquestions,
            request.language,
        )
        all_token_scores.extend(token_scores)

        boundaries = split_sentences(doc.text)
        for idx, (start, end) in enumerate(boundaries):
            token_indices = [
                i
                for i, tok in enumerate(doc_tokens)
                if tok.start >= start and tok.end <= end
            ]
            if not token_indices:
                continue
            scores = [token_scores[i] for i in token_indices]
            score = float(sum(scores) / len(scores))
            sentence_scores.append(
                SentenceScore(
                    doc_id=doc.doc_id,
                    index=idx,
                    start=start,
                    end=end,
                    text=doc.text[start:end],
                    score=score,
                    token_count=len(token_indices),
                )
            )

    if not sentence_scores:
        raise HTTPException(status_code=400, detail="Unable to score context")

    scores = [s.score for s in sentence_scores]
    mean_score = sum(scores) / len(scores)
    variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
    threshold = request.threshold
    if threshold is None:
        threshold = min(0.9, max(0.15, mean_score + (variance ** 0.5) * 0.5))

    candidates = [s for s in sentence_scores if s.score >= threshold]
    if request.keep_at_least_sentences:
        if len(candidates) < request.keep_at_least_sentences:
            sorted_scores = sorted(sentence_scores, key=lambda s: s.score, reverse=True)
            candidates = sorted_scores[: request.keep_at_least_sentences]

    candidates = sorted(candidates, key=lambda s: (-s.score, s.index))

    if request.keep_at_least_sources:
        by_doc: dict[str, SentenceScore] = {}
        for candidate in candidates:
            by_doc.setdefault(candidate.doc_id, candidate)
        if len(by_doc) < request.keep_at_least_sources:
            for candidate in sentence_scores:
                if candidate.doc_id not in by_doc:
                    by_doc[candidate.doc_id] = candidate
                if len(by_doc) >= request.keep_at_least_sources:
                    break
            candidates = list({*candidates, *by_doc.values()})

    if request.budget:
        packed: list[SentenceScore] = []
        remaining = request.budget
        for candidate in sorted(candidates, key=lambda s: s.score / max(s.token_count, 1), reverse=True):
            if candidate.token_count <= remaining:
                packed.append(candidate)
                remaining -= candidate.token_count
        candidates = packed

    conflict_sets = detect_conflicts(sentence_scores) if request.detect_contradictions else []
    conflict_indices = {index for c in conflict_sets for index in c.member_indices}

    for candidate in candidates:
        selected_sentences.append(
            SelectedSentence(
                doc_id=candidate.doc_id,
                index=candidate.index,
                start=candidate.start,
                end=candidate.end,
                text=candidate.text,
                score=candidate.score,
                token_count=candidate.token_count,
                conflict_set_id=(
                    next(
                        (c.id for c in conflict_sets if candidate.index in c.member_indices),
                        None,
                    )
                    if candidate.index in conflict_indices
                    else None
                ),
            )
        )

    if request.granularity in {"clause", "span"}:
        for doc in documents:
            doc_tokens = tokenize(doc.text)
            token_scores = highlighter.score_tokens(
                request.query,
                doc.text,
                request.subquestions,
                request.language,
            )
            low_threshold = threshold * 0.6
            spans = []
            active_start = None
            active_score = 0.0
            token_count = 0
            for token, score in zip(doc_tokens, token_scores):
                if score >= threshold and active_start is None:
                    active_start = token.start
                    active_score = score
                    token_count = 1
                elif active_start is not None and score >= low_threshold:
                    token_count += 1
                    active_score = max(active_score, score)
                elif active_start is not None:
                    spans.append((active_start, token.end, active_score, token_count))
                    active_start = None
                    active_score = 0.0
                    token_count = 0
            if active_start is not None:
                spans.append((active_start, doc_tokens[-1].end, active_score, token_count))

            for start, end, score, token_count in spans:
                if request.granularity == "clause":
                    for clause_start, clause_end in split_clauses(doc.text[start:end]):
                        selected_spans.append(
                            SelectedSpan(
                                doc_id=doc.doc_id,
                                start=start + clause_start,
                                end=start + clause_end,
                                text=doc.text[start + clause_start : start + clause_end],
                                score=score,
                                token_count=token_count,
                            )
                        )
                else:
                    selected_spans.append(
                        SelectedSpan(
                            doc_id=doc.doc_id,
                            start=start,
                            end=end,
                            text=doc.text[start:end],
                            score=score,
                            token_count=token_count,
                        )
                    )

    kept_tokens = sum(s.token_count for s in selected_sentences)
    compression_rate = kept_tokens / max(total_tokens, 1)

    response = HighlightResponse(
        selected_spans=selected_spans,
        selected_sentences=selected_sentences,
        sentence_scores=sentence_scores,
        token_scores=all_token_scores if request.return_metrics else None,
        compression_rate=compression_rate,
        kept_token_count=kept_tokens,
        total_token_count=total_tokens,
        model_version=f"{DEFAULT_MODEL_ID}@{DEFAULT_MODEL_REVISION}",
        timings_ms={
            "total": (time.perf_counter() - start_time) * 1000,
        },
        conflict_sets=conflict_sets,
    )

    cache.set(payload_hash, response)
    return response
