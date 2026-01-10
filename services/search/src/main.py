import importlib
import logging
import os
import random
import statistics
import time
from collections import Counter, defaultdict, deque
from collections.abc import Iterable
from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger("search-service")
audit_logger = logging.getLogger("search-audit")

app = FastAPI(title="IntelGraph Search Service", version="0.2.0")


SUPPORTED_LANGUAGES: dict[str, str] = {
    "any": "any",
    "en": "english",
    "es": "spanish",
    "fr": "french",
    "de": "german",
}


DOCUMENTS: list[dict[str, Any]] = [
    {
        "id": "doc-1",
        "title": "Graph security analytics pipeline",
        "text": "Building resilient graph analytics for intelligence teams with fast triage.",
        "language": "en",
        "category": "intelligence",
        "tags": ["analytics", "security", "graph"],
    },
    {
        "id": "doc-2",
        "title": "Búsqueda multilingüe para informes de misión",
        "text": "Soporte de búsqueda avanzada con filtros y facetas para analistas.",
        "language": "es",
        "category": "operaciones",
        "tags": ["misiones", "facetas", "multilenguaje"],
    },
    {
        "id": "doc-3",
        "title": "Analyse de similarité pour renseignements",
        "text": "Moteur de recherche tolérant aux fautes d'orthographe et aux synonymes.",
        "language": "fr",
        "category": "intelligence",
        "tags": ["fuzzy", "similarité", "synonymes"],
    },
    {
        "id": "doc-4",
        "title": "Erkennung relevanter Signale",
        "text": "Ranking mit Felderhöhung für sicherheitsrelevante Ereignisse.",
        "language": "de",
        "category": "signals",
        "tags": ["relevanz", "tuning", "sicherheit"],
    },
    {
        "id": "doc-5",
        "title": "AI copilot suggestions for analysts",
        "text": "Predictive query suggestions and behavioral analytics for analysts.",
        "language": "en",
        "category": "copilot",
        "tags": ["suggestions", "analytics", "ai"],
    },
]


DEFAULT_SUGGESTIONS = [
    "graph analytics",
    "mission search",
    "behavioral telemetry",
    "threat hunting",
    "multi-language intelligence",
]


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


class FeatureFlags:
    def enabled(self, name: str, default: bool = False) -> bool:
        return env_flag(name, default)


# Optional dependencies are loaded lazily to honor environments without the
# corresponding search backends installed.
def optional_import(module_name: str, attr_name: str) -> Any:
    if importlib.util.find_spec(module_name) is None:
        return None
    module = importlib.import_module(module_name)
    return getattr(module, attr_name)


OpenSearch = optional_import("opensearchpy", "OpenSearch")
ElasticsearchClient = optional_import("elasticsearch", "Elasticsearch")
MeiliSearchClient = optional_import("meilisearch", "Client")
AIOKafkaConsumer = optional_import("aiokafka", "AIOKafkaConsumer")


class FacetResult(BaseModel):
    field: str
    counts: dict[str, int]


class Suggestion(BaseModel):
    text: str
    score: float = Field(ge=0, le=1)


class SearchHit(BaseModel):
    id: str
    score: float
    source: dict[str, Any]


class QueryRequest(BaseModel):
    query: str
    filters: dict[str, Any] | None = None
    size: int = Field(default=10, ge=1, le=100)
    seed: int | None = None
    backend: Literal["mock", "elasticsearch", "meilisearch", "opensearch"] = "mock"
    fuzziness: int = Field(default=1, ge=0, le=2)
    language: str = Field(default="any")
    facets: list[str] = Field(default_factory=list)
    boosts: dict[str, float] = Field(default_factory=dict)
    explain: bool = False

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language: {value}")
        return value


class QueryResponse(BaseModel):
    hits: list[SearchHit]
    tookMs: int
    backend: str
    total: int
    facets: list[FacetResult] = Field(default_factory=list)
    suggestions: list[Suggestion] = Field(default_factory=list)
    explain: dict[str, Any] | None = None


class IndexRequest(BaseModel):
    label: str
    action: str = Field(pattern="^(start|stop)$")


class SchemaInfo(BaseModel):
    name: str
    mapping: dict[str, Any]
    vector_dims: int
    language: str


class AnalyticsSnapshot(BaseModel):
    queries: dict[str, int]
    languages: dict[str, int]
    avgLatencyMs: float
    p95LatencyMs: float
    totalQueries: int


class BackendSearchResult(BaseModel):
    hits: list[SearchHit]
    total: int
    facets: list[FacetResult]
    suggestions: list[Suggestion]
    backend: str


class ChangeEventPayload(BaseModel):
    sequence: int = Field(gt=0)
    action: Literal["upsert", "delete"]
    document: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def ensure_identifier(self) -> "ChangeEventPayload":
        if not self.document.get("id"):
            raise ValueError("document.id is required for reindex events")
        return self


class ReindexStartRequest(BaseModel):
    label: str
    batchSize: int = Field(default=50, ge=1, le=500)


class ReindexBatchRequest(BaseModel):
    batchSize: int = Field(default=50, ge=1, le=500)


class ReindexEventsRequest(BaseModel):
    events: list[ChangeEventPayload]


class CutoverRequest(BaseModel):
    label: str


class ReindexStatus(BaseModel):
    activeIndex: str
    candidateIndex: str | None
    lastSequence: int
    processedEvents: int
    remainingEvents: int
    lag: int
    lastBatchMs: float
    batches: int
    indexHealth: str
    dualWriteEnabled: bool
    status: Literal["idle", "running"]
    startedAt: float | None


class SearchAnalytics:
    def __init__(self) -> None:
        self.query_counters: defaultdict[str, Counter[str]] = defaultdict(Counter)
        self.language_counters: defaultdict[str, Counter[str]] = defaultdict(Counter)
        self.latencies: defaultdict[str, deque[int]] = defaultdict(lambda: deque(maxlen=2000))

    def record_query(self, tenant_id: str, query: QueryRequest, took_ms: int) -> None:
        normalized = query.query.lower().strip()
        if normalized:
            self.query_counters[tenant_id][normalized] += 1
        self.language_counters[tenant_id][query.language] += 1
        self.latencies[tenant_id].append(took_ms)

    def suggestions(self, tenant_id: str, prefix: str, limit: int = 5) -> list[Suggestion]:
        prefix_lower = prefix.lower()
        ranked: list[Suggestion] = []
        query_counter = self.query_counters[tenant_id]
        for term, count in query_counter.most_common():
            if term.startswith(prefix_lower):
                score = min(1.0, 0.3 + (count / max(1, query_counter.total())))
                ranked.append(Suggestion(text=term, score=score))
            if len(ranked) >= limit:
                break
        return ranked or [Suggestion(text=s, score=0.2) for s in DEFAULT_SUGGESTIONS[:limit]]

    def snapshot(self, tenant_id: str) -> AnalyticsSnapshot:
        latencies = list(self.latencies[tenant_id])
        avg_latency = statistics.fmean(latencies) if latencies else 0.0
        p95 = statistics.quantiles(latencies, n=100)[94] if latencies else 0.0
        query_counter = self.query_counters[tenant_id]
        language_counter = self.language_counters[tenant_id]
        return AnalyticsSnapshot(
            queries=dict(query_counter.most_common(10)),
            languages=dict(language_counter),
            avgLatencyMs=round(avg_latency, 2),
            p95LatencyMs=round(p95, 2),
            totalQueries=query_counter.total(),
        )

    def reset(self) -> None:
        self.query_counters.clear()
        self.language_counters.clear()
        self.latencies.clear()


class IndexRegistry:
    def __init__(self, feature_flags: FeatureFlags, base_documents: list[dict[str, Any]]) -> None:
        self.feature_flags = feature_flags
        self.base_documents = deepcopy(base_documents)
        self.indices: dict[str, dict[str, Any]] = {}
        self.active_label = "primary"
        self.previous_label: str | None = None
        self.candidate_label: str | None = None
        self.reset()

    def reset(self) -> None:
        self.indices = {
            "primary": {
                "documents": deepcopy(self.base_documents),
                "last_seq": 0,
                "health": "green",
            },
        }
        self.active_label = "primary"
        self.previous_label = None
        self.candidate_label = None

    def active_documents(self) -> list[dict[str, Any]]:
        return self.indices[self.active_label]["documents"]

    def candidate_documents(self) -> list[dict[str, Any]]:
        if self.candidate_label:
            return self.indices[self.candidate_label]["documents"]
        return []

    def create_candidate(self, label: str) -> None:
        self.indices[label] = {
            "documents": deepcopy(self.active_documents()),
            "last_seq": self.indices[self.active_label]["last_seq"],
            "health": "yellow",
        }
        self.candidate_label = label

    def apply_change(self, event: ChangeEventPayload, label: str) -> None:
        index = self.indices.get(label)
        if index is None:
            raise HTTPException(status_code=400, detail=f"unknown index {label}")
        docs = index["documents"]
        target_id = event.document.get("id")
        existing_idx = next((i for i, doc in enumerate(docs) if doc.get("id") == target_id), None)
        if event.action == "delete":
            if existing_idx is not None:
                docs.pop(existing_idx)
        else:
            payload = deepcopy(event.document)
            if existing_idx is not None:
                docs[existing_idx] = {**docs[existing_idx], **payload}
            else:
                docs.append(payload)
        index["last_seq"] = max(index.get("last_seq", 0), event.sequence)
        index["health"] = self.health(label, 0)

    def apply_live_change(self, event: ChangeEventPayload) -> bool:
        self.apply_change(event, self.active_label)
        applied_to_candidate = False
        if self.feature_flags.enabled("SEARCH_DUAL_WRITE") and self.candidate_label:
            self.apply_change(event, self.candidate_label)
            applied_to_candidate = True
        return applied_to_candidate

    def cutover(self, label: str) -> None:
        if label not in self.indices:
            raise HTTPException(status_code=400, detail=f"index {label} not found")
        self.previous_label = self.active_label
        self.active_label = label

    def rollback(self) -> None:
        if not self.previous_label:
            raise HTTPException(status_code=400, detail="no previous index to rollback to")
        self.active_label, self.previous_label = self.previous_label, self.active_label

    def latest_sequence(self, label: str) -> int:
        index = self.indices.get(label, {})
        return int(index.get("last_seq", 0))

    @staticmethod
    def health(label: str, lag: int) -> str:
        if lag <= 0:
            return "green"
        if lag < 5:
            return "yellow"
        return "red"


@dataclass
class ReindexJob:
    label: str
    batch_size: int
    last_processed_seq: int = 0
    processed_events: int = 0
    batches: int = 0
    last_batch_ms: float = 0.0
    started_at: float = 0.0


class ReindexPipeline:
    def __init__(self, registry: IndexRegistry, feature_flags: FeatureFlags) -> None:
        self.registry = registry
        self.feature_flags = feature_flags
        self.events: list[ChangeEventPayload] = []
        self.job: ReindexJob | None = None
        self.started_at: float | None = None

    def reset(self) -> None:
        self.events = []
        self.job = None
        self.started_at = None

    def _require_enabled(self) -> None:
        if not self.feature_flags.enabled("SEARCH_REINDEX_V1"):
            raise HTTPException(status_code=400, detail="reindex pipeline disabled")

    def start(self, label: str, batch_size: int) -> ReindexStatus:
        self._require_enabled()
        self.registry.create_candidate(label)
        self.job = ReindexJob(
            label=label,
            batch_size=batch_size,
            last_processed_seq=self.registry.latest_sequence(self.registry.active_label),
            started_at=time.time(),
        )
        self.started_at = self.job.started_at
        return self.status()

    def enqueue(self, events: list[ChangeEventPayload]) -> ReindexStatus:
        self._require_enabled()
        for event in sorted(events, key=lambda item: item.sequence):
            already_applied = self.registry.apply_live_change(event)
            self.events.append(event)
            if already_applied and self.job and self.registry.candidate_label == self.job.label:
                self.job.last_processed_seq = max(self.job.last_processed_seq, event.sequence)
                self.job.processed_events += 1
        return self.status()

    def run_batch(self, batch_size: int | None = None) -> ReindexStatus:
        self._require_enabled()
        if self.job is None:
            raise HTTPException(status_code=400, detail="no reindex job to resume")

        target_batch_size = batch_size or self.job.batch_size
        pending = [event for event in self.events if event.sequence > self.job.last_processed_seq]
        batch = pending[:target_batch_size]
        if batch:
            start = time.perf_counter()
            for event in batch:
                self.registry.apply_change(event, self.job.label)
                self.job.last_processed_seq = event.sequence
                self.job.processed_events += 1
            self.job.last_batch_ms = (time.perf_counter() - start) * 1000
            self.job.batches += 1
        return self.status()

    def cutover(self, label: str) -> ReindexStatus:
        self._require_enabled()
        self.registry.cutover(label)
        return self.status()

    def rollback(self) -> ReindexStatus:
        self._require_enabled()
        self.registry.rollback()
        return self.status()

    def status(self) -> ReindexStatus:
        self._require_enabled()
        lag = 0
        last_sequence = 0
        if self.job:
            last_sequence = self.job.last_processed_seq
            if self.events:
                lag = max(event.sequence for event in self.events) - self.job.last_processed_seq
        active = self.registry.active_label
        candidate = self.registry.candidate_label
        remaining = 0
        if self.job:
            remaining = len(
                [event for event in self.events if event.sequence > self.job.last_processed_seq]
            )
        return ReindexStatus(
            activeIndex=active,
            candidateIndex=candidate,
            lastSequence=last_sequence,
            processedEvents=self.job.processed_events if self.job else 0,
            remainingEvents=remaining,
            lag=lag,
            lastBatchMs=self.job.last_batch_ms if self.job else 0.0,
            batches=self.job.batches if self.job else 0,
            indexHealth=self.registry.health(candidate or active, lag),
            dualWriteEnabled=self.feature_flags.enabled("SEARCH_DUAL_WRITE"),
            status="running" if self.job else "idle",
            startedAt=self.started_at,
        )


class SearchEngine:
    def __init__(self, index_registry: IndexRegistry) -> None:
        self.index_registry = index_registry
        self.elasticsearch = self._init_elasticsearch()
        self.meilisearch = self._init_meilisearch()
        self.opensearch = self._init_opensearch()

    @staticmethod
    def _init_elasticsearch() -> Any:
        if ElasticsearchClient is None:
            return None
        url = os.getenv("ELASTICSEARCH_URL")
        if not url:
            return None
        return ElasticsearchClient(url, request_timeout=2)

    @staticmethod
    def _init_meilisearch() -> Any:
        if MeiliSearchClient is None:
            return None
        url = os.getenv("MEILISEARCH_URL")
        api_key = os.getenv("MEILISEARCH_API_KEY")
        if not url:
            return None
        return MeiliSearchClient(url, api_key=api_key)

    @staticmethod
    def _init_opensearch() -> Any:
        if OpenSearch is None:
            return None
        host = os.getenv("OPENSEARCH_HOST")
        if not host:
            return None
        return OpenSearch(hosts=[host])

    def search(self, request: QueryRequest) -> BackendSearchResult:
        if request.backend == "elasticsearch" and self.elasticsearch is not None:
            try:
                return self._search_elasticsearch(request)
            except Exception as exc:  # pragma: no cover - runtime network errors
                logger.warning("elasticsearch search failed; falling back", exc_info=exc)
        if request.backend == "meilisearch" and self.meilisearch is not None:
            try:
                return self._search_meilisearch(request)
            except Exception as exc:  # pragma: no cover - runtime network errors
                logger.warning("meilisearch search failed; falling back", exc_info=exc)
        if request.backend == "opensearch" and self.opensearch is not None:
            try:
                return self._search_opensearch(request)
            except Exception as exc:  # pragma: no cover - runtime network errors
                logger.warning("opensearch search failed; falling back", exc_info=exc)
        return self._search_mock(request)

    def suggest(self, prefix: str, language: str = "any", limit: int = 5) -> list[Suggestion]:
        filtered_docs = [
            doc
            for doc in self.index_registry.active_documents()
            if language == "any" or doc["language"] == language
        ]
        candidates: list[Suggestion] = []
        prefix_lower = prefix.lower()
        for doc in filtered_docs:
            for field in (doc.get("title", ""), doc.get("text", "")):
                for token in field.split():
                    token_clean = token.strip().lower().strip(",.;!?")
                    if token_clean.startswith(prefix_lower) and token_clean:
                        score = min(1.0, 0.5 + len(prefix_lower) / max(len(token_clean), 1))
                        candidates.append(Suggestion(text=token_clean, score=score))
        candidates.sort(key=lambda item: item.score, reverse=True)
        seen: set[str] = set()
        deduped: list[Suggestion] = []
        for candidate in candidates:
            if candidate.text in seen:
                continue
            seen.add(candidate.text)
            deduped.append(candidate)
            if len(deduped) >= limit:
                break
        return deduped or [Suggestion(text=s, score=0.2) for s in DEFAULT_SUGGESTIONS[:limit]]

    def _search_elasticsearch(self, request: QueryRequest) -> BackendSearchResult:
        fuzziness = request.fuzziness if request.fuzziness else "AUTO"
        query_body = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": request.query,
                                "fields": ["title^2", "text"],
                                "fuzziness": fuzziness,
                                "analyzer": SUPPORTED_LANGUAGES.get(request.language, "standard"),
                            }
                        }
                    ],
                    "filter": self._build_filters(request.filters),
                }
            },
            "aggs": {facet: {"terms": {"field": facet}} for facet in request.facets},
            "size": request.size,
        }
        response = self.elasticsearch.search(index="documents", body=query_body)
        hits = [
            SearchHit(id=doc["_id"], score=doc["_score"], source=doc.get("_source", {}))
            for doc in response["hits"]["hits"]
        ]
        facets = self._parse_es_facets(response.get("aggregations", {}))
        suggestions = self.suggest(request.query, request.language)
        return BackendSearchResult(
            hits=hits,
            total=int(response["hits"]["total"].get("value", len(hits))),
            facets=facets,
            suggestions=suggestions,
            backend="elasticsearch",
        )

    def _search_meilisearch(self, request: QueryRequest) -> BackendSearchResult:
        options = {
            "limit": request.size,
            "attributesToHighlight": ["*"],
            "filter": self._meili_filters(request.filters),
            "facets": request.facets,
        }
        response = self.meilisearch.index("documents").search(
            request.query,
            options={
                **options,
                "attributesToCrop": ["text"],
                "cropLength": 120,
                "matchingStrategy": "all",
            },
        )
        hits = [
            SearchHit(
                id=str(doc.get("id")),
                score=float(doc.get("_matchesPosition", {}).get("text", [{}])[0].get("start", 1)),
                source=doc,
            )
            for doc in response.get("hits", [])
        ]
        facets = [
            FacetResult(field=field, counts=counts)
            for field, counts in (response.get("facetDistribution", {}) or {}).items()
        ]
        suggestions = self.suggest(request.query, request.language)
        return BackendSearchResult(
            hits=hits,
            total=int(response.get("estimatedTotalHits", len(hits))),
            facets=facets,
            suggestions=suggestions,
            backend="meilisearch",
        )

    def _search_opensearch(self, request: QueryRequest) -> BackendSearchResult:
        query_body = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": request.query,
                                "fields": ["title^2", "text"],
                                "fuzziness": request.fuzziness,
                            }
                        }
                    ],
                    "filter": self._build_filters(request.filters),
                }
            },
            "size": request.size,
        }
        response = self.opensearch.search(index="documents", body=query_body)
        hits = [
            SearchHit(id=doc["_id"], score=doc["_score"], source=doc.get("_source", {}))
            for doc in response["hits"]["hits"]
        ]
        suggestions = self.suggest(request.query, request.language)
        return BackendSearchResult(
            hits=hits,
            total=int(response["hits"]["total"].get("value", len(hits))),
            facets=[],
            suggestions=suggestions,
            backend="opensearch",
        )

    @staticmethod
    def _build_filters(filters: dict[str, Any] | None) -> list[dict[str, Any]]:
        if not filters:
            return []
        built: list[dict[str, Any]] = []
        for key, value in filters.items():
            if isinstance(value, list):
                built.append({"terms": {key: value}})
            else:
                built.append({"term": {key: value}})
        return built

    def _meili_filters(self, filters: dict[str, Any] | None) -> list[str] | None:
        if not filters:
            return None
        clauses: list[str] = []
        for key, value in filters.items():
            if isinstance(value, list):
                clauses.append(" OR ".join([f"{key} = {v!r}" for v in value]))
            else:
                clauses.append(f"{key} = {value!r}")
        return clauses

    @staticmethod
    def _parse_es_facets(aggregations: dict[str, Any]) -> list[FacetResult]:
        facets: list[FacetResult] = []
        for key, agg in aggregations.items():
            buckets = {
                bucket.get("key"): bucket.get("doc_count", 0) for bucket in agg.get("buckets", [])
            }
            facets.append(FacetResult(field=key, counts=buckets))
        return facets

    def _search_mock(self, request: QueryRequest) -> BackendSearchResult:
        filtered = self._apply_filters(
            self.index_registry.active_documents(), request.filters, request.language
        )
        scored = list(self._score_documents(filtered, request))
        if request.seed is not None:
            rng = random.Random(request.seed)
            rng.shuffle(scored)
        else:
            scored.sort(key=lambda item: item[1], reverse=True)
        hits = [
            SearchHit(id=doc["id"], score=score, source=doc)
            for doc, score in scored[: request.size]
        ]
        facets = self._facet_counts(filtered, request.facets)
        suggestions = self.suggest(request.query, request.language)
        return BackendSearchResult(
            hits=hits,
            total=len(filtered),
            facets=facets,
            suggestions=suggestions,
            backend="mock",
        )

    @staticmethod
    def _apply_filters(
        documents: Iterable[dict[str, Any]], filters: dict[str, Any] | None, language: str
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for doc in documents:
            if language != "any" and doc.get("language") != language:
                continue
            if filters:
                failed = False
                for key, value in filters.items():
                    if isinstance(value, list):
                        if doc.get(key) not in value and not set(value).intersection(
                            set(doc.get(key, []))
                        ):
                            failed = True
                            break
                    elif doc.get(key) != value and value not in doc.get(key, []):
                        failed = True
                        break
                if failed:
                    continue
            results.append(doc)
        return results

    @staticmethod
    def _score_documents(
        documents: Iterable[dict[str, Any]], request: QueryRequest
    ) -> Iterable[tuple[dict[str, Any], float]]:
        query_lower = request.query.lower()
        for doc in documents:
            text = f"{doc.get('title', '')} {doc.get('text', '')}".lower()
            overlap = 0
            if query_lower in text:
                overlap = 1.0
            else:
                overlap = SearchEngine._fuzzy_ratio(text, query_lower, request.fuzziness)
            boost_factor = 1.0
            for field, weight in request.boosts.items():
                field_value = doc.get(field)
                if isinstance(field_value, str) and field_value.lower().find(query_lower) >= 0:
                    boost_factor += weight
                if isinstance(field_value, list) and query_lower in [
                    item.lower() for item in field_value
                ]:
                    boost_factor += weight
            yield doc, min(1.0, overlap * boost_factor)

    @staticmethod
    def _fuzzy_ratio(text: str, query: str, fuzziness: int) -> float:
        if not text or not query:
            return 0.0
        if query in text:
            return 0.9
        proximity = sum(
            1 for token in text.split() if token.startswith(query[: max(1, len(query) - fuzziness)])
        )
        return min(0.85, 0.3 + (proximity / max(1, len(text.split()))))

    @staticmethod
    def _facet_counts(documents: list[dict[str, Any]], facets: list[str]) -> list[FacetResult]:
        results: list[FacetResult] = []
        for facet in facets:
            counts: defaultdict[str, int] = defaultdict(int)
            for doc in documents:
                value = doc.get(facet)
                if isinstance(value, list):
                    for item in value:
                        counts[str(item)] += 1
                elif value is not None:
                    counts[str(value)] += 1
            results.append(FacetResult(field=facet, counts=dict(counts)))
        return results


audit_logger.info("search-service initialized")
feature_flags = FeatureFlags()
index_registry = IndexRegistry(feature_flags=feature_flags, base_documents=DOCUMENTS)
search_engine = SearchEngine(index_registry=index_registry)
analytics = SearchAnalytics()
reindex_pipeline = ReindexPipeline(registry=index_registry, feature_flags=feature_flags)


@app.post("/search/query", response_model=QueryResponse)
async def search(request: Request, query: QueryRequest) -> QueryResponse:
    tenant_id = request.headers.get("x-tenant-id", "anonymous")
    start = time.perf_counter()
    audit_logger.info(
        "query",
        extra={
            "q": query.query,
            "filters": query.filters,
            "backend": query.backend,
            "tenant": tenant_id,
        },
    )
    result = search_engine.search(query)
    took_ms = int((time.perf_counter() - start) * 1000)
    analytics.record_query(tenant_id, query, took_ms)
    return QueryResponse(
        hits=result.hits,
        tookMs=took_ms,
        backend=result.backend,
        total=result.total,
        facets=result.facets,
        suggestions=result.suggestions,
        explain={"fuzziness": query.fuzziness} if query.explain else None,
    )


@app.get("/search/suggest", response_model=list[Suggestion])
async def suggest(
    request: Request, q: str = Query(min_length=1), language: str = Query(default="any")
) -> list[Suggestion]:
    tenant_id = request.headers.get("x-tenant-id", "anonymous")
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="unsupported language")
    audit_logger.info("suggest", extra={"q": q, "language": language, "tenant": tenant_id})
    combined = analytics.suggestions(tenant_id, q) + search_engine.suggest(q, language)
    combined.sort(key=lambda item: item.score, reverse=True)
    seen: set[str] = set()
    deduped: list[Suggestion] = []
    for item in combined:
        if item.text in seen:
            continue
        seen.add(item.text)
        deduped.append(item)
        if len(deduped) >= 5:
            break
    return deduped


@app.post("/search/index")
async def index_control(req: IndexRequest) -> dict[str, str]:
    audit_logger.info("index", extra=req.model_dump())
    return {"status": f"{req.action}ed", "label": req.label}


@app.post("/search/reindex/start", response_model=ReindexStatus)
async def start_reindex(req: ReindexStartRequest) -> ReindexStatus:
    audit_logger.info("reindex_start", extra=req.model_dump())
    return reindex_pipeline.start(req.label, req.batchSize)


@app.post("/search/reindex/events", response_model=ReindexStatus)
async def enqueue_reindex_events(req: ReindexEventsRequest) -> ReindexStatus:
    audit_logger.info("reindex_events", extra={"count": len(req.events)})
    return reindex_pipeline.enqueue(req.events)


@app.post("/search/reindex/run", response_model=ReindexStatus)
async def run_reindex(req: ReindexBatchRequest) -> ReindexStatus:
    audit_logger.info("reindex_run", extra=req.model_dump())
    return reindex_pipeline.run_batch(req.batchSize)


@app.post("/search/reindex/cutover", response_model=ReindexStatus)
async def cutover_reindex(req: CutoverRequest) -> ReindexStatus:
    audit_logger.info("reindex_cutover", extra=req.model_dump())
    return reindex_pipeline.cutover(req.label)


@app.post("/search/reindex/rollback", response_model=ReindexStatus)
async def rollback_reindex() -> ReindexStatus:
    audit_logger.info("reindex_rollback")
    return reindex_pipeline.rollback()


@app.get("/search/reindex/status", response_model=ReindexStatus)
async def reindex_status() -> ReindexStatus:
    audit_logger.info("reindex_status")
    return reindex_pipeline.status()


@app.get("/search/schemas", response_model=list[SchemaInfo])
async def schemas() -> list[SchemaInfo]:
    audit_logger.info("schemas")
    return [
        SchemaInfo(
            name="documents",
            mapping={
                "properties": {
                    "title": {"type": "text", "analyzer": SUPPORTED_LANGUAGES["en"]},
                    "text": {"type": "text", "analyzer": SUPPORTED_LANGUAGES["en"]},
                    "tags": {"type": "keyword"},
                    "category": {"type": "keyword"},
                    "language": {"type": "keyword"},
                }
            },
            vector_dims=384,
            language="multi",
        )
    ]


@app.get("/search/analytics", response_model=AnalyticsSnapshot)
async def analytics_snapshot(request: Request) -> AnalyticsSnapshot:
    tenant_id = request.headers.get("x-tenant-id", "anonymous")
    audit_logger.info("analytics", extra={"tenant": tenant_id})
    return analytics.snapshot(tenant_id)


def reset_state() -> None:
    analytics.reset()
    index_registry.reset()
    reindex_pipeline.reset()


async def start_indexer() -> None:
    if AIOKafkaConsumer is None:
        logger.warning("aiokafka not installed; indexer disabled")
        return

    consumer = AIOKafkaConsumer("ingest.canonical.v1")
    await consumer.start()
    try:
        async for msg in consumer:  # pragma: no cover - network loop
            logger.debug("consume", extra={"offset": msg.offset})
    finally:
        await consumer.stop()


if __name__ == "__main__":  # pragma: no cover - manual execution
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
