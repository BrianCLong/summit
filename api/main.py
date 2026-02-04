import json
import os
import time
from datetime import datetime
from typing import List, Dict, Any

import redis
import spacy
from fastapi import Depends, FastAPI, Header, HTTPException
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable

# OpenTelemetry Imports
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from pydantic import BaseModel
from redis.exceptions import ConnectionError
from sentence_transformers import SentenceTransformer

from intelgraph_ai_ml.graph_forecaster import GraphForecaster

from .llm_provider import llm_provider  # Import the LLM provider
from .platform_spine import flags

# --- App Initialization ---
app = FastAPI()

# --- OpenTelemetry Setup ---
resource = Resource(attributes={SERVICE_NAME: "wargame-api-service"})
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://localhost:4317")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# --- Configuration ---
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
API_KEY = os.environ.get("API_KEY", "supersecretapikey")

neo4j_driver = None
redis_client = None
graph_forecaster = None

# --- AI/ML Model Loading ---
nlp = None
sentence_model = None

@app.on_event("startup")
async def startup_event():
    FastAPIInstrumentor.instrument_app(app)

    # Initialize Neo4j Driver with retry
    global neo4j_driver, graph_forecaster
    max_attempts = 10
    delay = 5
    for attempt in range(max_attempts):
        try:
            print(f"API service: Attempting to connect to Neo4j (Attempt {attempt + 1}/{max_attempts})...")
            neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            neo4j_driver.verify_connectivity()
            print("API service: Successfully connected to Neo4j.")
            # Initialize graph forecaster
            graph_forecaster = GraphForecaster(neo4j_uri=NEO4J_URI, user=NEO4J_USER, password=NEO4J_PASSWORD)
            break
        except Exception as e:
            print(f"API service: Neo4j connection failed: {e}. Retrying in {delay} seconds...")
            time.sleep(delay)
    else:
        print("API service: Failed to connect to Neo4j after multiple attempts.")

    # Initialize Redis Client with retry
    global redis_client
    for attempt in range(max_attempts):
        try:
            print(f"API service: Attempting to connect to Redis (Attempt {attempt + 1}/{max_attempts})...")
            redis_client = redis.from_url(REDIS_URL)
            redis_client.ping()
            print("API service: Successfully connected to Redis.")
            break
        except Exception as e:
            print(f"API service: Redis connection failed: {e}. Retrying in {delay} seconds...")
            time.sleep(delay)
    else:
        print("API service: Failed to connect to Redis after multiple attempts.")

    # Load AI models
    global nlp, sentence_model
    try:
        print("API service: Loading spaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
        print("API service: spaCy model loaded.")
    except Exception as e:
        print(f"API service: Error loading spaCy model: {e}")

    try:
        print("API service: Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
        print("API service: SentenceTransformer model loaded.")
    except Exception as e:
        print(f"API service: Error loading SentenceTransformer model: {e}")

@app.on_event("shutdown")
def shutdown_event():
    FastAPIInstrumentor.uninstrument_app(app)
    if neo4j_driver:
        neo4j_driver.close()
    print("API service: Neo4j driver closed.")

# --- Dependencies ---
async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Dependency to verify API key."""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

# --- Pydantic Models ---
class TelemetryAnalysisRequest(BaseModel):
    text: str

class TelemetryAnalysisResponse(BaseModel):
    entities: List[dict]
    sentiment: float
    narratives: List[str]

class IntentEstimationRequest(BaseModel):
    telemetry_summary: str
    graph_data_summary: str
    adversary_profile: str

class IntentEstimationResponse(BaseModel):
    estimated_intent: str
    likelihood: float
    reasoning: str

class PlaybookGenerationRequest(BaseModel):
    crisis_type: str
    target_audiences: List[str]
    key_narratives: List[str]
    adversary_profiles: List[str]
    doctrine_references: List[str] = []

class PlaybookGenerationResponse(BaseModel):
    name: str
    doctrine_reference: str
    description: str
    steps: List[str]
    metrics_of_effectiveness: List[str]
    metrics_of_performance: List[str]

class EdgePrediction(BaseModel):
    source: str
    target: str
    timestamp: datetime
    confidence: float

class ForecastResponse(BaseModel):
    edges: List[EdgePrediction]

# --- Routers ---
# Include GNN router
try:
    from .gnn import router as gnn_router
    app.include_router(gnn_router)
except ImportError:
    pass

# Multi-product router integration
if flags.MULTIPRODUCT_ENABLED:
    try:
        from .factflow.router import router as factflow_router
        from .factlaw.router import router as factlaw_router
        from .factmarkets.router import router as factmarkets_router
        from .factgov.router import router as factgov_router

        app.include_router(factflow_router, prefix="/api")
        app.include_router(factlaw_router, prefix="/api")
        app.include_router(factmarkets_router, prefix="/api")
        app.include_router(factgov_router, prefix="/api")
    except ImportError as e:
        print(f"API service: Failed to load multi-product routers: {e}")

# --- Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/graph")
def get_graph_data():
    if not neo4j_driver:
        raise HTTPException(status_code=503, detail="Neo4j not connected")
    query = "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100"
    with neo4j_driver.session() as session:
        result = session.run(query)
        nodes = []
        edges = []
        node_ids = set()
        for record in result:
            source_node = record["n"]
            relationship = record["r"]
            target_node = record["m"]
            if source_node.id not in node_ids:
                nodes.append({"id": source_node.id, "label": list(source_node.labels)[0], "properties": dict(source_node)})
                node_ids.add(source_node.id)
            if target_node.id not in node_ids:
                nodes.append({"id": target_node.id, "label": list(target_node.labels)[0], "properties": dict(target_node)})
                node_ids.add(target_node.id)
            edges.append({"id": relationship.id, "source": relationship.start_node.id, "target": relationship.end_node.id, "type": relationship.type, "properties": dict(relationship)})
    return {"nodes": nodes, "edges": edges}

@app.post("/analyze-telemetry", response_model=TelemetryAnalysisResponse)
async def analyze_telemetry(request: TelemetryAnalysisRequest, api_key: str = Depends(verify_api_key)):
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Analysis is for hypothetical data.
    if not nlp or not sentence_model:
        raise HTTPException(status_code=503, detail="NLP models not loaded.")
    doc = nlp(request.text)
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
    sentiment = sum([token.sentiment for token in doc]) / len(doc) if len(doc) > 0 else 0.0
    narratives = []
    if "disinfo" in request.text.lower(): narratives.append("disinformation_campaign")
    if "unity" in request.text.lower(): narratives.append("unity_messaging")
    if "threat" in request.text.lower(): narratives.append("threat_mitigation")
    return {"entities": entities, "sentiment": sentiment, "narratives": narratives}

@app.post("/estimate-intent", response_model=IntentEstimationResponse)
async def estimate_intent(request: IntentEstimationRequest, api_key: str = Depends(verify_api_key)):
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Estimates are hypothetical and for simulation only.
    prompt = (
        f"Estimate intent based on telemetry: {request.telemetry_summary}. "
        f"Graph data: {request.graph_data_summary}. Adversary: {request.adversary_profile}. "
        "Provide estimated_intent, likelihood (0-1), and reasoning in JSON format."
    )
    llm_response_str = await llm_provider._cached_generate_text(prompt)
    llm_response = json.loads(llm_response_str)
    return {
        "estimated_intent": llm_response.get("estimated_intent", "Unknown"),
        "likelihood": llm_response.get("likelihood", 0.5),
        "reasoning": llm_response.get("reasoning", "No reasoning provided by LLM."),
    }

@app.post("/generate-playbook", response_model=PlaybookGenerationResponse)
async def generate_playbook(request: PlaybookGenerationRequest, api_key: str = Depends(verify_api_key)):
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Playbooks are theoretical and for training/simulation.
    prompt = (
        f"Generate a strategic playbook for a {request.crisis_type} crisis. "
        f"Target audiences: {', '.join(request.target_audiences)}. "
        f"Key narratives: {', '.join(request.key_narratives)}. "
        f"Adversary profiles: {', '.join(request.adversary_profiles)}. "
        f"Doctrine references: {', '.join(request.doctrine_references)}. "
        "Provide name, doctrine_reference, description, steps (list), "
        "metrics_of_effectiveness (list), and metrics_of_performance (list) in JSON format."
    )
    llm_response_str = await llm_provider._cached_generate_text(prompt)
    llm_response = json.loads(llm_response_str)
    return {
        "name": llm_response.get("name", "Generated Playbook"),
        "doctrine_reference": llm_response.get("doctrine_reference", "N/A"),
        "description": llm_response.get("description", "No description."),
        "steps": llm_response.get("steps", []),
        "metrics_of_effectiveness": llm_response.get("metrics_of_effectiveness", []),
        "metrics_of_performance": llm_response.get("metrics_of_performance", []),
    }

@app.get("/forecast/graph", response_model=ForecastResponse)
async def forecast_graph(entity_id: str, past_days: int = 14, future_days: int = 30):
    if not graph_forecaster:
        raise HTTPException(status_code=503, detail="Graph forecaster not initialized")
    cache_key = f"forecast:{entity_id}:{past_days}:{future_days}"
    if redis_client:
        cached = redis_client.get(cache_key)
        if cached:
            return ForecastResponse.parse_raw(cached)
    predictions = graph_forecaster.predict(entity_id, past_days, future_days)
    response = ForecastResponse(edges=[EdgePrediction(**p.to_dict()) for p in predictions])
    if redis_client:
        redis_client.setex(cache_key, 3600, response.json())
    return response
