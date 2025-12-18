import importlib
import logging
import os
import random
import statistics
import time
from collections import Counter, defaultdict, deque
from typing import Any, Iterable, Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

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


class SearchAnalytics:
    def __init__(self) -> None:
        self.query_counter: Counter[str] = Counter()
        self.language_counter: Counter[str] = Counter()
        self.latencies: deque[int] = deque(maxlen=2000)

    def record_query(self, query: QueryRequest, took_ms: int) -> None:
        normalized = query.query.lower().strip()
        if normalized:
            self.query_counter[normalized] += 1
        self.language_counter[query.language] += 1
        self.latencies.append(took_ms)

    def suggestions(self, prefix: str, limit: int = 5) -> list[Suggestion]:
        prefix_lower = prefix.lower()
        ranked: list[Suggestion] = []
        for term, count in self.query_counter.most_common():
            if term.startswith(prefix_lower):
                score = min(1.0, 0.3 + (count / max(1, self.query_counter.total())))
                ranked.append(Suggestion(text=term, score=score))
            if len(ranked) >= limit:
                break
        return ranked or [Suggestion(text=s, score=0.2) for s in DEFAULT_SUGGESTIONS[:limit]]

    def snapshot(self) -> AnalyticsSnapshot:
        latencies = list(self.latencies)
        avg_latency = statistics.fmean(latencies) if latencies else 0.0
        p95 = statistics.quantiles(latencies, n=100)[94] if latencies else 0.0
        return AnalyticsSnapshot(
            queries=dict(self.query_counter.most_common(10)),
            languages=dict(self.language_counter),
            avgLatencyMs=round(avg_latency, 2),
            p95LatencyMs=round(p95, 2),
            totalQueries=self.query_counter.total(),
        )

    def reset(self) -> None:
        self.query_counter.clear()
        self.language_counter.clear()
        self.latencies.clear()


class SearchEngine:
    def __init__(self) -> None:
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
        filtered_docs = [doc for doc in DOCUMENTS if language == "any" or doc["language"] == language]
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
            SearchHit(id=str(doc.get("id")), score=float(doc.get("_matchesPosition", {}).get("text", [{}])[0].get("start", 1)), source=doc)
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
                clauses.append(" OR ".join([f"{key} = {repr(v)}" for v in value]))
            else:
                clauses.append(f"{key} = {repr(value)}")
        return clauses

    @staticmethod
    def _parse_es_facets(aggregations: dict[str, Any]) -> list[FacetResult]:
        facets: list[FacetResult] = []
        for key, agg in aggregations.items():
            buckets = {bucket.get("key"): bucket.get("doc_count", 0) for bucket in agg.get("buckets", [])}
            facets.append(FacetResult(field=key, counts=buckets))
        return facets

    def _search_mock(self, request: QueryRequest) -> BackendSearchResult:
        filtered = self._apply_filters(DOCUMENTS, request.filters, request.language)
        scored = list(self._score_documents(filtered, request))
        if request.seed is not None:
            rng = random.Random(request.seed)
            rng.shuffle(scored)
        else:
            scored.sort(key=lambda item: item[1], reverse=True)
        hits = [SearchHit(id=doc["id"], score=score, source=doc) for doc, score in scored[: request.size]]
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
    def _apply_filters(documents: Iterable[dict[str, Any]], filters: dict[str, Any] | None, language: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for doc in documents:
            if language != "any" and doc.get("language") != language:
                continue
            if filters:
                failed = False
                for key, value in filters.items():
                    if isinstance(value, list):
                        if doc.get(key) not in value and not set(value).intersection(set(doc.get(key, []))):
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
    def _score_documents(documents: Iterable[dict[str, Any]], request: QueryRequest) -> Iterable[tuple[dict[str, Any], float]]:
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
                if isinstance(field_value, list) and query_lower in [item.lower() for item in field_value]:
                    boost_factor += weight
            yield doc, min(1.0, overlap * boost_factor)

    @staticmethod
    def _fuzzy_ratio(text: str, query: str, fuzziness: int) -> float:
        if not text or not query:
            return 0.0
        if query in text:
            return 0.9
        proximity = sum(1 for token in text.split() if token.startswith(query[: max(1, len(query) - fuzziness)]))
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
search_engine = SearchEngine()
analytics = SearchAnalytics()


@app.post("/search/query", response_model=QueryResponse)
async def search(query: QueryRequest) -> QueryResponse:
    start = time.perf_counter()
    audit_logger.info("query", extra={"q": query.query, "filters": query.filters, "backend": query.backend})
    result = search_engine.search(query)
    took_ms = int((time.perf_counter() - start) * 1000)
    analytics.record_query(query, took_ms)
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
async def suggest(q: str = Query(min_length=1), language: str = Query(default="any")) -> list[Suggestion]:
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="unsupported language")
    audit_logger.info("suggest", extra={"q": q, "language": language})
    combined = analytics.suggestions(q) + search_engine.suggest(q, language)
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
async def analytics_snapshot() -> AnalyticsSnapshot:
    audit_logger.info("analytics")
    return analytics.snapshot()


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
