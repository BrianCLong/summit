import json
import os
import time
from datetime import datetime

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

from .llm_provider import llm_provider

# --- Configuration & Constants ---
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
API_KEY = os.environ.get("API_KEY", "supersecretapikey")

# --- Pydantic Models for AI/ML Endpoints ---
class TelemetryAnalysisRequest(BaseModel):
    text: str

class TelemetryAnalysisResponse(BaseModel):
    entities: list[dict]
    sentiment: float
    narratives: list[str]

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
    target_audiences: list[str]
    key_narratives: list[str]
    adversary_profiles: list[str]
    doctrine_references: list[str] = []

class PlaybookGenerationResponse(BaseModel):
    name: str
    doctrine_reference: str
    description: str
    steps: list[str]
    metrics_of_effectiveness: list[str]
    metrics_of_performance: list[str]

class EdgePrediction(BaseModel):
    source: str
    target: str
    timestamp: datetime
    confidence: float

class ForecastResponse(BaseModel):
    edges: list[EdgePrediction]

# --- Dependencies ---
async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Dependency to verify API key."""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

# --- App Initialization ---
resource = Resource(attributes={SERVICE_NAME: "wargame-api-service"})
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://localhost:4317")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

app = FastAPI()

# --- AI/ML Model Loading ---
nlp = None
sentence_model = None

@app.on_event("startup")
async def load_models():
    FastAPIInstrumentor.instrument_app(app)
    global nlp, sentence_model
    try:
        print("API service: Loading spaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
        print("API service: spaCy model loaded.")
    except Exception as e:
        print(f"API service: Error loading spaCy model: {e}")
        nlp = None

    try:
        print("API service: Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
        print("API service: SentenceTransformer model loaded.")
    except Exception as e:
        print(f"API service: Error loading SentenceTransformer model: {e}")
        sentence_model = None

@app.on_event("shutdown")
def shutdown_event():
    FastAPIInstrumentor.uninstrument_app(app)
    if neo4j_driver:
        neo4j_driver.close()
    print("API service: Neo4j driver closed.")

# --- DB Globals ---
neo4j_driver = None
redis_client = None

# --- API Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/graph")
def get_graph_data():
    if not neo4j_driver:
        return {"nodes": [], "edges": []}
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
    if not nlp or not sentence_model:
        raise HTTPException(status_code=503, detail="NLP models not loaded.")
    doc = nlp(request.text)
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
    sentiment = sum([token.sentiment for token in doc]) / len(doc) if len(doc) > 0 else 0.0
    narratives = []
    if "disinfo" in request.text.lower():
        narratives.append("disinformation_campaign")
    if "unity" in request.text.lower():
        narratives.append("unity_messaging")
    if "threat" in request.text.lower():
        narratives.append("threat_mitigation")
    return {"entities": entities, "sentiment": sentiment, "narratives": narratives}

@app.post("/estimate-intent", response_model=IntentEstimationResponse)
async def estimate_intent(request: IntentEstimationRequest, api_key: str = Depends(verify_api_key)):
    prompt = f"Estimate intent based on telemetry: {request.telemetry_summary}..."
    llm_response_str = await llm_provider._cached_generate_text(prompt)
    llm_response = json.loads(llm_response_str)
    return {
        "estimated_intent": llm_response.get("estimated_intent", "Unknown"),
        "likelihood": llm_response.get("likelihood", 0.5),
        "reasoning": llm_response.get("reasoning", "No reasoning provided by LLM."),
    }

@app.post("/generate-playbook", response_model=PlaybookGenerationResponse)
async def generate_playbook(request: PlaybookGenerationRequest, api_key: str = Depends(verify_api_key)):
    prompt = f"Generate a strategic playbook for a {request.crisis_type} crisis..."
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
    cache_key = GraphForecaster.cache_key(entity_id, past_days, future_days)
    if redis_client:
        cached = redis_client.get(cache_key)
        if cached:
            return ForecastResponse.parse_raw(cached)
    if 'graph_forecaster' not in globals():
         raise HTTPException(503, "GraphForecaster not ready")
    predictions = graph_forecaster.predict(entity_id, past_days, future_days)
    response = ForecastResponse(edges=[EdgePrediction(**p.to_dict()) for p in predictions])
    if redis_client:
        redis_client.setex(cache_key, 3600, response.json())
    return response

# --- Router Includes ---
try:
    from .gnn import router as gnn_router
    app.include_router(gnn_router)
except Exception:
    pass

try:
    from .factgov.router import router as factgov_router
    app.include_router(factgov_router)
except Exception as e:
    print(f"Failed to include FactGov router: {e}")
    pass

# --- DB Connections ---
# Initialize graph forecaster
graph_forecaster = GraphForecaster(neo4j_uri=NEO4J_URI, user=NEO4J_USER, password=NEO4J_PASSWORD)

# Initialize Neo4j Driver with retry
max_attempts = 10
delay = 5
for attempt in range(max_attempts):
    try:
        print(f"API service: Attempting to connect to Neo4j (Attempt {attempt + 1}/{max_attempts})...")
        neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        neo4j_driver.verify_connectivity()
        print("API service: Successfully connected to Neo4j.")
        break
    except ServiceUnavailable as e:
        print(f"API service: Neo4j connection failed: {e}. Retrying in {delay} seconds...")
        time.sleep(delay)
    except Exception as e:
        print(f"API service: An unexpected error occurred during Neo4j connection: {e}")
        time.sleep(delay)
else:
    # We continue without Neo4j for now, but in prod this might be fatal
    print("API service: Failed to connect to Neo4j after multiple attempts. Graph features disabled.")

# Initialize Redis Client with retry
for attempt in range(max_attempts):
    try:
        print(f"API service: Attempting to connect to Redis (Attempt {attempt + 1}/{max_attempts})...")
        redis_client = redis.from_url(REDIS_URL)
        redis_client.ping()
        print("API service: Successfully connected to Redis.")
        break
    except ConnectionError as e:
        print(f"API service: Redis connection failed: {e}. Retrying in {delay} seconds...")
        time.sleep(delay)
    except Exception as e:
        print(f"API service: An unexpected error occurred during Redis connection: {e}")
        time.sleep(delay)
else:
    print("API service: Failed to connect to Redis after multiple attempts. Caching disabled.")
