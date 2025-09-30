"""FastAPI service exposing Hugging Face sentiment analysis with Postgres ingestion
and Neo4j persistence.
"""
from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Callable, Dict, Iterable, List, Optional

try:
    from fastapi import FastAPI, HTTPException
except Exception:  # pragma: no cover - fallback for testing environments without FastAPI
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class FastAPI:  # type: ignore
        def __init__(self, *args, **kwargs):
            pass

        def on_event(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

        def post(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

try:
    from pydantic import BaseModel
except Exception:  # pragma: no cover - lightweight fallback for tests
    class BaseModel:  # type: ignore
        def __init__(self, **data):
            for key, value in data.items():
                setattr(self, key, value)

        def dict(self):
            return dict(self.__dict__)

try:
    import psycopg2  # type: ignore
    from psycopg2.extras import RealDictCursor  # type: ignore
except Exception:  # pragma: no cover - allow tests without psycopg2
    psycopg2 = None  # type: ignore
    RealDictCursor = None  # type: ignore

try:
    from neo4j import GraphDatabase, basic_auth
except Exception:  # pragma: no cover - allow running without neo4j driver
    GraphDatabase = None  # type: ignore
    basic_auth = None  # type: ignore

try:
    import torch  # type: ignore
except Exception:  # pragma: no cover - optional dependency fallback
    torch = None  # type: ignore

try:
    import tensorflow as tf  # type: ignore
except Exception:  # pragma: no cover - optional dependency fallback
    tf = None  # type: ignore

from transformers import pipeline

logger = logging.getLogger("ml-engine-python")
logging.basicConfig(level=logging.INFO)


class Settings:
    """Runtime configuration for the Python model service."""

    def __init__(self, **overrides: object) -> None:
        self.postgres_host = str(overrides.get('postgres_host', os.getenv('POSTGRES_HOST', 'localhost')))
        self.postgres_port = int(overrides.get('postgres_port', os.getenv('POSTGRES_PORT', '5432')))
        self.postgres_db = str(overrides.get('postgres_db', os.getenv('POSTGRES_DB', 'intelgraph')))
        self.postgres_user = str(overrides.get('postgres_user', os.getenv('POSTGRES_USER', 'intelgraph')))
        self.postgres_password = str(overrides.get('postgres_password', os.getenv('POSTGRES_PASSWORD', 'password')))
        self.postgres_ingest_query = str(
            overrides.get(
                'postgres_ingest_query',
                os.getenv(
                    'POSTGRES_INGEST_QUERY',
                    "SELECT id, payload ->> 'text' AS text FROM ingest_records WHERE job_id = %(job_id)s ORDER BY created_at ASC LIMIT %(limit)s",
                ),
            ),
        )

        self.neo4j_uri = str(overrides.get('neo4j_uri', os.getenv('NEO4J_URI', 'bolt://localhost:7687')))
        self.neo4j_user = str(overrides.get('neo4j_user', os.getenv('NEO4J_USERNAME', 'neo4j')))
        self.neo4j_password = str(overrides.get('neo4j_password', os.getenv('NEO4J_PASSWORD', 'password')))
        neo4j_db_override = overrides.get('neo4j_database', os.getenv('NEO4J_DATABASE'))
        self.neo4j_database = str(neo4j_db_override) if neo4j_db_override is not None else None

        self.huggingface_task = str(overrides.get('huggingface_task', os.getenv('HUGGINGFACE_TASK', 'sentiment-analysis')))
        self.huggingface_model = str(
            overrides.get(
                'huggingface_model',
                os.getenv('HUGGINGFACE_MODEL', 'cardiffnlp/twitter-roberta-base-sentiment-latest'),
            ),
        )
        token_override = overrides.get('huggingface_token', os.getenv('HUGGINGFACE_TOKEN'))
        self.huggingface_token = str(token_override) if token_override is not None else None
        self.default_framework = str(overrides.get('default_framework', os.getenv('ML_PYTHON_DEFAULT_FRAMEWORK', 'auto')))

        self.service_host = str(overrides.get('service_host', os.getenv('PYTHON_SERVICE_HOST', '0.0.0.0')))
        self.service_port = int(overrides.get('service_port', os.getenv('PYTHON_SERVICE_PORT', '8001')))

        self.ingest_default_limit = int(overrides.get('ingest_default_limit', os.getenv('INGEST_WIZARD_DEFAULT_LIMIT', '100')))


class SentimentPayload(BaseModel):
    """Request payload for direct sentiment inference."""

    texts: Optional[List[str]] = None
    job_id: Optional[str] = None
    limit: Optional[int] = None
    model_name: Optional[str] = None
    framework: Optional[str] = None


class SentimentPrediction(BaseModel):
    text: str
    label: str
    score: float
    model_name: str
    framework: str
    job_id: Optional[str] = None
    source_id: Optional[str] = None
    neo4j_node_id: Optional[str] = None


class SentimentResponse(BaseModel):
    predictions: List[SentimentPrediction]
    job_id: Optional[str] = None
    processed_count: int
    neo4j_batch_id: Optional[str] = None


class SentimentModelService:
    """Wrapper around Hugging Face pipelines supporting PyTorch and TensorFlow."""

    def __init__(
        self,
        settings: Settings,
        pipeline_factory: Callable[..., Callable[[Iterable[str]], List[Dict[str, float]]]] = pipeline,
    ) -> None:
        self._settings = settings
        self._pipeline_factory = pipeline_factory
        self._pipeline: Optional[Callable[[Iterable[str]], List[Dict[str, float]]]] = None
        self._current_model = settings.huggingface_model
        self._current_framework = settings.default_framework

    def load(self, *, model_name: Optional[str] = None, framework: Optional[str] = None) -> None:
        requested_model = model_name or self._current_model
        requested_framework = framework or self._current_framework
        resolved_framework = self._resolve_framework(requested_framework)

        logger.info(
            "Loading Hugging Face pipeline",
            extra={
                "model": requested_model,
                "framework": resolved_framework,
            },
        )

        token = self._settings.huggingface_token
        device = 0 if resolved_framework == "pt" and torch and torch.cuda.is_available() else -1
        pipeline_kwargs: Dict[str, object] = {
            "task": self._settings.huggingface_task,
            "model": requested_model,
            "framework": resolved_framework if resolved_framework != "auto" else None,
            "token": token,
            "device": device,
        }

        self._pipeline = self._pipeline_factory(**{k: v for k, v in pipeline_kwargs.items() if v is not None})
        self._current_model = requested_model
        self._current_framework = requested_framework

    def predict(self, texts: Iterable[str], *, job_id: Optional[str] = None) -> List[SentimentPrediction]:
        text_list = list(texts)
        if not text_list:
            raise ValueError("No texts supplied for prediction")

        if self._pipeline is None:
            self.load()

        assert self._pipeline is not None  # nosec - guarded above
        raw_results = self._pipeline(text_list)
        predictions: List[SentimentPrediction] = []
        for idx, raw in enumerate(raw_results):
            # Transformers pipeline returns list[dict]
            label = raw.get("label", "neutral")
            score = float(raw.get("score", 0.0))
            predictions.append(
                SentimentPrediction(
                    text=text_list[idx],
                    label=label,
                    score=score,
                    model_name=self._current_model,
                    framework=self._canonical_framework(self._current_framework),
                    job_id=job_id,
                )
            )
        return predictions

    def _resolve_framework(self, value: Optional[str]) -> str:
        candidate = (value or self._settings.default_framework or "auto").lower()
        if candidate in {"torch", "pt"}:
            if torch is None:
                raise RuntimeError("PyTorch is not available in this runtime")
            return "pt"
        if candidate in {"tensorflow", "tf"}:
            if tf is None:
                raise RuntimeError("TensorFlow is not available in this runtime")
            return "tf"
        return "auto"

    def _canonical_framework(self, value: str) -> str:
        candidate = value.lower()
        if candidate in {"pt", "torch"}:
            return "torch"
        if candidate in {"tf", "tensorflow"}:
            return "tensorflow"
        return "auto"


class PostgresIngestor:
    """Fetches ingestion records from PostgreSQL for downstream processing."""

    def __init__(self, settings: Settings, connection_factory: Optional[Callable[..., Any]] = None) -> None:
        self._settings = settings
        if connection_factory is None:
            if psycopg2 is None:
                raise RuntimeError('psycopg2 is not installed; PostgreSQL ingest is unavailable')
            connection_factory = psycopg2.connect  # type: ignore[attr-defined]
        self._connection_factory = connection_factory
        self._cursor_factory = RealDictCursor
        self._conn: Optional[Any] = None

    def _get_connection(self) -> Any:
        if self._conn is None:
            logger.info("Connecting to PostgreSQL", extra={"host": self._settings.postgres_host})
            kwargs: Dict[str, Any] = {
                'host': self._settings.postgres_host,
                'port': self._settings.postgres_port,
                'user': self._settings.postgres_user,
                'password': self._settings.postgres_password,
                'dbname': self._settings.postgres_db,
            }
            if self._cursor_factory is not None:
                kwargs['cursor_factory'] = self._cursor_factory
            self._conn = self._connection_factory(**kwargs)
        return self._conn

    def fetch_records(self, job_id: str, limit: Optional[int] = None) -> List[Dict[str, str]]:
        limit_value = limit or self._settings.ingest_default_limit
        with self._get_connection().cursor() as cursor:
            cursor.execute(
                self._settings.postgres_ingest_query,
                {"job_id": job_id, "limit": limit_value},
            )
            rows = cursor.fetchall()
        return [{"source_id": str(row["id"]), "text": row.get("text", "")} for row in rows]

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None


class Neo4jGraphWriter:
    """Persists sentiment predictions into Neo4j."""

    def __init__(self, settings: Settings, driver_factory: Optional[Callable[..., Any]] = None) -> None:
        self._settings = settings
        if driver_factory is None:
            if GraphDatabase is None:
                self._disabled = True
                self._driver_factory = None
            else:
                self._disabled = False
                self._driver_factory = GraphDatabase.driver
        else:
            self._disabled = False
            self._driver_factory = driver_factory
        self._driver: Optional[Any] = None

    def _get_driver(self) -> Any:
        if self._disabled or self._driver_factory is None:
            raise RuntimeError('Neo4j driver is not available in this environment')
        if self._driver is None:
            logger.info("Connecting to Neo4j", extra={"uri": self._settings.neo4j_uri})
            kwargs: Dict[str, Any] = {}
            if basic_auth is not None:
                kwargs['auth'] = basic_auth(self._settings.neo4j_user, self._settings.neo4j_password)
            self._driver = self._driver_factory(self._settings.neo4j_uri, **kwargs)
        return self._driver

    def write(self, job_id: str, predictions: List[SentimentPrediction]) -> Optional[str]:
        if not predictions:
            return None

        if self._disabled:
            logger.warning('Neo4j driver unavailable; skipping sentiment persistence', extra={'job_id': job_id})
            return None

        session_kwargs: Dict[str, str] = {}
        if self._settings.neo4j_database:
            session_kwargs['database'] = self._settings.neo4j_database

        with self._get_driver().session(**session_kwargs) as session:
            result = session.execute_write(self._write_tx, job_id, [p.dict() for p in predictions])
        return result

    @staticmethod
    def _write_tx(tx, job_id: str, predictions: List[Dict[str, object]]) -> Optional[str]:
        query = """
        MERGE (job:IngestJob {jobId: $jobId})
        WITH job, $predictions AS predictions
        UNWIND predictions AS prediction
        MERGE (src:IngestSource {sourceId: prediction.source_id})
          ON CREATE SET src.createdAt = datetime()
        SET src.text = prediction.text
        MERGE (sent:SentimentResult {id: coalesce(prediction.neo4j_node_id, randomUUID())})
          ON CREATE SET sent.createdAt = datetime()
        SET sent.label = prediction.label,
            sent.score = prediction.score,
            sent.modelName = prediction.model_name,
            sent.framework = prediction.framework,
            sent.text = prediction.text
        MERGE (src)-[:HAS_SENTIMENT]->(sent)
        MERGE (job)-[:PRODUCED]->(sent)
        RETURN collect(sent.id) AS ids
        """
        record = tx.run(query, jobId=job_id, predictions=predictions).single()
        if record:
            ids = record.get("ids")
            if ids:
                return str(ids[0])
        return None

    def close(self) -> None:
        if self._driver and not self._disabled:
            self._driver.close()
            self._driver = None


class IngestWizardBridge:
    """Orchestrates ingestion job execution end-to-end."""

    def __init__(
        self,
        ingestor: PostgresIngestor,
        writer: Neo4jGraphWriter,
        model_service: SentimentModelService,
    ) -> None:
        self._ingestor = ingestor
        self._writer = writer
        self._model_service = model_service

    def run_job(self, job_id: str, *, limit: Optional[int] = None, model_name: Optional[str] = None, framework: Optional[str] = None) -> SentimentResponse:
        records = self._ingestor.fetch_records(job_id, limit)
        if not records:
            return SentimentResponse(predictions=[], job_id=job_id, processed_count=0)

        texts = [record["text"] for record in records]
        if model_name or framework:
            self._model_service.load(model_name=model_name, framework=framework)

        predictions = self._model_service.predict(texts, job_id=job_id)
        for prediction, record in zip(predictions, records):
            prediction.source_id = record["source_id"]
            prediction.neo4j_node_id = str(uuid.uuid4())

        batch_id = self._writer.write(job_id, predictions)
        return SentimentResponse(
            predictions=predictions,
            job_id=job_id,
            processed_count=len(predictions),
            neo4j_batch_id=batch_id,
        )


settings = Settings()
model_service = SentimentModelService(settings)

try:
    postgres_ingestor: Optional[PostgresIngestor] = PostgresIngestor(settings)
except RuntimeError as exc:  # pragma: no cover
    logger.warning('PostgreSQL integration disabled: %s', exc)
    postgres_ingestor = None

try:
    neo4j_writer: Optional[Neo4jGraphWriter] = Neo4jGraphWriter(settings)
except RuntimeError as exc:  # pragma: no cover
    logger.warning('Neo4j integration disabled: %s', exc)
    neo4j_writer = None

if postgres_ingestor and neo4j_writer:
    bridge: Optional[IngestWizardBridge] = IngestWizardBridge(postgres_ingestor, neo4j_writer, model_service)
else:  # pragma: no cover
    bridge = None

app = FastAPI(title="IntelGraph ML Engine Python Service", version="1.0.0")


@app.on_event("shutdown")
def shutdown_event() -> None:
    if postgres_ingestor:
        postgres_ingestor.close()
    if neo4j_writer:
        neo4j_writer.close()


@app.post("/predict", response_model=SentimentResponse)
def predict(payload: SentimentPayload) -> SentimentResponse:
    if postgres_ingestor is None or neo4j_writer is None:
        raise HTTPException(status_code=503, detail="Database integrations are not configured")

    texts = payload.texts or []
    if payload.job_id:
        records = postgres_ingestor.fetch_records(payload.job_id, payload.limit)
        texts = [record["text"] for record in records]

    if not texts:
        raise HTTPException(status_code=400, detail="No texts provided for prediction")

    if payload.model_name or payload.framework:
        model_service.load(model_name=payload.model_name, framework=payload.framework)

    predictions = model_service.predict(texts, job_id=payload.job_id)
    batch_id = neo4j_writer.write(payload.job_id or "ad-hoc", predictions)
    return SentimentResponse(
        predictions=predictions,
        job_id=payload.job_id,
        processed_count=len(predictions),
        neo4j_batch_id=batch_id,
    )


@app.post("/ingest-wizard/run", response_model=SentimentResponse)
def ingest_wizard_run(payload: SentimentPayload) -> SentimentResponse:
    if not payload.job_id:
        raise HTTPException(status_code=400, detail="job_id is required for ingest wizard execution")

    if bridge is None:
        raise HTTPException(status_code=503, detail="Ingest wizard integration is not configured")

    return bridge.run_job(
        payload.job_id,
        limit=payload.limit,
        model_name=payload.model_name,
        framework=payload.framework,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.service_host, port=settings.service_port)
