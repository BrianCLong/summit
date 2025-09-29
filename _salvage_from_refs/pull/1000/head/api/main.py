import os
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
import redis
from redis.exceptions import ConnectionError
import os
import time
import os
import time
import os
import time
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
import redis
from redis.exceptions import ConnectionError
import spacy
from sentence_transformers import SentenceTransformer
import json # Added json import

# OpenTelemetry Imports
from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from .llm_provider import llm_provider # Import the LLM provider

# ... existing app, NEO4J_URI, etc. ...

# OpenTelemetry Setup
# WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
# Ethics Compliance: OpenTelemetry is for monitoring hypothetical simulations.
resource = Resource(attributes={
    SERVICE_NAME: "wargame-api-service"
})
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317")) # Default OTLP gRPC endpoint
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# --- AI/ML Model Loading ---
# WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
# Ethics Compliance: Models are for hypothetical scenario simulation only.
nlp = None
sentence_model = None
# llm_pipeline = None # Removed llm_pipeline

@app.on_event("startup")
async def load_models():
    FastAPIInstrumentor.instrument_app(app)
    global nlp, sentence_model
    try:
        print("API service: Loading spaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
        print("API service: spaCy model loaded.")
    except Exception as e:
        print(f"API service: Error loading spaCy model: {e}. Please ensure 'en_core_web_sm' is downloaded (python -m spacy download en_core_web_sm)")
        nlp = None

    try:
        print("API service: Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("API service: SentenceTransformer model loaded.")
    except Exception as e:
        print(f"API service: Error loading SentenceTransformer model: {e}. Please ensure 'all-MiniLM-L6-v2' is downloaded or accessible.")
        sentence_model = None

@app.on_event("shutdown")
def shutdown_event():
    FastAPIInstrumentor.uninstrument_app(app)
    if neo4j_driver:
        neo4j_driver.close()
    print("API service: Neo4j driver closed.")

# ... Pydantic Models ...

# ... API Endpoints (health, graph) ...

@app.post("/estimate-intent", response_model=IntentEstimationResponse)
async def estimate_intent(request: IntentEstimationRequest, api_key: str = Depends(verify_api_key)): # Added Depends
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Estimates are hypothetical and for simulation only.
    # Use LLM provider for intent estimation
    prompt = (
        f"Estimate intent based on telemetry: {request.telemetry_summary}. "
        f"Graph data: {request.graph_data_summary}. Adversary: {request.adversary_profile}. "
        "Provide estimated_intent, likelihood (0-1), and reasoning in JSON format."
    )
    llm_response_str = await llm_provider._cached_generate_text(prompt)
    llm_response = json.loads(llm_response_str) # Parse JSON response from LLM

    return {
        "estimated_intent": llm_response.get("estimated_intent", "Unknown"),
        "likelihood": llm_response.get("likelihood", 0.5),
        "reasoning": llm_response.get("reasoning", "No reasoning provided by LLM."),
    }

@app.post("/generate-playbook", response_model=PlaybookGenerationResponse)
async def generate_playbook(request: PlaybookGenerationRequest, api_key: str = Depends(verify_api_key)): # Added Depends
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Playbooks are theoretical and for training/simulation.
    # Use LLM provider for playbook generation
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
    llm_response = json.loads(llm_response_str) # Parse JSON response from LLM

    return {
        "name": llm_response.get("name", "Generated Playbook"),
        "doctrine_reference": llm_response.get("doctrine_reference", "N/A"),
        "description": llm_response.get("description", "No description."),
        "steps": llm_response.get("steps", []),
        "metrics_of_effectiveness": llm_response.get("metrics_of_effectiveness", []),
        "metrics_of_performance": llm_response.get("metrics_of_performance", []),
    }

# OpenTelemetry Imports
from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()

NEO4J_URI = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

neo4j_driver = None
redis_client = None
max_attempts = 10
delay = 5

# Initialize Neo4j Driver with retry
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
    raise Exception("API service: Failed to connect to Neo4j after multiple attempts.")

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
    raise Exception("API service: Failed to connect to Redis after multiple attempts.")

# OpenTelemetry Setup
# WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
# Ethics Compliance: OpenTelemetry is for monitoring hypothetical simulations.
resource = Resource(attributes={
    SERVICE_NAME: "wargame-api-service"
})
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317")) # Default OTLP gRPC endpoint
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# --- AI/ML Model Loading ---
# WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
# Ethics Compliance: Models are for hypothetical scenario simulation only.
nlp = None
sentence_model = None
# llm_pipeline = None # Placeholder for LLM

@app.on_event("startup")
async def load_models():
    FastAPIInstrumentor.instrument_app(app)
    global nlp, sentence_model # , llm_pipeline
    try:
        print("API service: Loading spaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
        print("API service: spaCy model loaded.")
    except Exception as e:
        print(f"API service: Error loading spaCy model: {e}. Please ensure 'en_core_web_sm' is downloaded (python -m spacy download en_core_web_sm)")
        nlp = None # Set to None if loading fails

    try:
        print("API service: Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("API service: SentenceTransformer model loaded.")
    except Exception as e:
        print(f"API service: Error loading SentenceTransformer model: {e}. Please ensure 'all-MiniLM-L6-v2' is downloaded or accessible.")
        sentence_model = None # Set to None if loading fails

    # try:
    #     print("API service: Loading LLM pipeline 'text-generation'...")
    #     # This is a placeholder. For Llama, you'd need specific model loading and potentially quantization.
    #     # llm_pipeline = pipeline("text-generation", model="distilgpt2") # Example small model
    #     print("API service: LLM pipeline loaded.")
    # except Exception as e:
    #     print(f"API service: Error loading LLM pipeline: {e}")
    #     llm_pipeline = None

@app.on_event("shutdown")
def shutdown_event():
    FastAPIInstrumentor.uninstrument_app(app)
    if neo4j_driver:
        neo4j_driver.close()
    print("API service: Neo4j driver closed.")
from pydantic import BaseModel
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
import redis
from redis.exceptions import ConnectionError
import spacy
from sentence_transformers import SentenceTransformer

# ... existing app, NEO4J_URI, etc. ...

# WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
# Ethics Compliance: This is a simplified API key authentication stub for demonstration.
# In a production environment, robust key management and validation are required.
API_KEY = os.environ.get("API_KEY", "supersecretapikey") # Default for dev, use env var in prod

async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Dependency to verify API key."""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

# ... existing model loading and shutdown events ...

# --- API Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/graph")
def get_graph_data():
    # ... existing code ...
    return {"nodes": nodes, "edges": edges}

@app.post("/analyze-telemetry", response_model=TelemetryAnalysisResponse)
async def analyze_telemetry(request: TelemetryAnalysisRequest, api_key: str = Depends(verify_api_key)): # Added Depends
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Analysis is for hypothetical data.
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

    return {
        "entities": entities,
        "sentiment": sentiment,
        "narratives": narratives,
    }

@app.post("/estimate-intent", response_model=IntentEstimationResponse)
async def estimate_intent(request: IntentEstimationRequest, api_key: str = Depends(verify_api_key)): # Added Depends
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Estimates are hypothetical and for simulation only.
    # ... existing code ...
    return {
        "estimated_intent": estimated_intent,
        "likelihood": likelihood,
        "reasoning": reasoning,
    }

@app.post("/generate-playbook", response_model=PlaybookGenerationResponse)
async def generate_playbook(request: PlaybookGenerationRequest, api_key: str = Depends(verify_api_key)): # Added Depends
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Playbooks are theoretical and for training/simulation.
    # ... existing code ...
    return {
        "name": name,
        "doctrine_reference": doctrine_reference,
        "description": description,
        "steps": steps,
        "metrics_of_effectiveness": metrics_of_effectiveness,
        "metrics_of_performance": metrics_of_performance,
    }
# For LLM, assuming a simple placeholder or a small local model for demonstration
# In a real scenario, this would integrate with a more robust LLM inference service
# from transformers import pipeline # Example for Hugging Face models

app = FastAPI()

NEO4J_URI = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

neo4j_driver = None
redis_client = None
max_attempts = 10
delay = 5

# Initialize Neo4j Driver with retry
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
    raise Exception("API service: Failed to connect to Neo4j after multiple attempts.")

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
    raise Exception("API service: Failed to connect to Redis after multiple attempts.")

# --- AI/ML Model Loading ---
# WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
# Ethics Compliance: Models are for hypothetical scenario simulation only.
nlp = None
sentence_model = None
# llm_pipeline = None # Placeholder for LLM

@app.on_event("startup")
async def load_models():
    global nlp, sentence_model # , llm_pipeline
    try:
        print("API service: Loading spaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
        print("API service: spaCy model loaded.")
    except Exception as e:
        print(f"API service: Error loading spaCy model: {e}. Please ensure 'en_core_web_sm' is downloaded (python -m spacy download en_core_web_sm)")
        nlp = None # Set to None if loading fails

    try:
        print("API service: Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("API service: SentenceTransformer model loaded.")
    except Exception as e:
        print(f"API service: Error loading SentenceTransformer model: {e}. Please ensure 'all-MiniLM-L6-v2' is downloaded or accessible.")
        sentence_model = None # Set to None if loading fails

    # try:
    #     print("API service: Loading LLM pipeline 'text-generation'...")
    #     # This is a placeholder. For Llama, you'd need specific model loading and potentially quantization.
    #     # llm_pipeline = pipeline("text-generation", model="distilgpt2") # Example small model
    #     print("API service: LLM pipeline loaded.")
    # except Exception as e:
    #     print(f"API service: Error loading LLM pipeline: {e}")
    #     llm_pipeline = None

@app.on_event("shutdown")
def shutdown_event():
    if neo4j_driver:
        neo4j_driver.close()
    print("API service: Neo4j driver closed.")

# --- Pydantic Models for AI/ML Endpoints ---
class TelemetryAnalysisRequest(BaseModel):
    text: str

class TelemetryAnalysisResponse(BaseModel):
    entities: list[dict]
    sentiment: float
    narratives: list[str]

class IntentEstimationRequest(BaseModel):
    telemetry_summary: str # Summary of social media telemetry
    graph_data_summary: str # Summary of relevant graph data (e.g., relationships, vulnerabilities)
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

# --- API Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/graph")
def get_graph_data():
    """Fetches a subgraph for visualization."""
    query = (
        "MATCH (n)-[r]->(m) "
        "RETURN n, r, m LIMIT 100"
    )
    with neo4j_driver.session() as session:
        result = session.run(query)
        nodes = []
        edges = []
        node_ids = set()

        for record in result:
            source_node = record['n']
            relationship = record['r']
            target_node = record['m']

            if source_node.id not in node_ids:
                nodes.append({
                    "id": source_node.id,
                    "label": list(source_node.labels)[0],
                    "properties": dict(source_node)
                })
                node_ids.add(source_node.id)

            if target_node.id not in node_ids:
                nodes.append({
                    "id": target_node.id,
                    "label": list(target_node.labels)[0],
                    "properties": dict(target_node)
                })
                node_ids.add(target_node.id)

            edges.append({
                "id": relationship.id,
                "source": relationship.start_node.id,
                "target": relationship.end_node.id,
                "type": relationship.type,
                "properties": dict(relationship)
            })

    return {"nodes": nodes, "edges": edges}

@app.post("/analyze-telemetry", response_model=TelemetryAnalysisResponse)
async def analyze_telemetry(request: TelemetryAnalysisRequest):
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Analysis is for hypothetical data.
    if not nlp or not sentence_model:
        raise HTTPException(status_code=503, detail="NLP models not loaded.")

    doc = nlp(request.text)
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]

    # Simple sentiment analysis (placeholder)
    # For real sentiment, integrate a dedicated sentiment model or library
    sentiment = sum([token.sentiment for token in doc]) / len(doc) if len(doc) > 0 else 0.0

    # Simple narrative detection (placeholder)
    # For real narratives, use clustering on embeddings or more advanced NLP
    narratives = []
    if "disinfo" in request.text.lower():
        narratives.append("disinformation_campaign")
    if "unity" in request.text.lower():
        narratives.append("unity_messaging")
    if "threat" in request.text.lower():
        narratives.append("threat_mitigation")

    return {
        "entities": entities,
        "sentiment": sentiment,
        "narratives": narratives,
    }

@app.post("/estimate-intent", response_model=IntentEstimationResponse)
async def estimate_intent(request: IntentEstimationRequest):
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Estimates are hypothetical and for simulation only.
    # This is a placeholder for LLM integration.
    # In a real scenario, you'd pass request.telemetry_summary, request.graph_data_summary,
    # and request.adversary_profile to an LLM and parse its response.

    # if not llm_pipeline:
    #     raise HTTPException(status_code=503, detail="LLM model not loaded.")

    # Mock LLM response
    estimated_intent = "High likelihood of disinformation escalation"
    likelihood = 0.85
    reasoning = (
        f"Based on simulated telemetry indicating increased activity around '{request.adversary_profile}' "
        f"and graph data showing connections to known disinformation nodes. "
        f"The telemetry summary: '{request.telemetry_summary}'. "
        f"The graph data summary: '{request.graph_data_summary}'. (Simulated LLM output)"
    )

    # Example of calling a local LLM (if llm_pipeline was loaded)
    # prompt = f"Analyze the following telemetry: {request.telemetry_summary}. Consider graph data: {request.graph_data_summary}. Estimate the intent of {request.adversary_profile}. Provide likelihood (0-1) and reasoning."
    # llm_output = llm_pipeline(prompt, max_new_tokens=100)[0]['generated_text']
    # Parse llm_output to extract intent, likelihood, reasoning

    return {
        "estimated_intent": estimated_intent,
        "likelihood": likelihood,
        "reasoning": reasoning,
    }

@app.post("/generate-playbook", response_model=PlaybookGenerationResponse)
async def generate_playbook(request: PlaybookGenerationRequest):
    # WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    # Ethics Compliance: Playbooks are theoretical and for training/simulation.
    # This is a placeholder for LLM integration.

    # if not llm_pipeline:
    #     raise HTTPException(status_code=503, detail="LLM model not loaded.")

    # Mock LLM response based on input parameters
    name = f"Counter-Narrative Playbook for {request.crisis_type}"
    doctrine_reference = "JP 3-13 Chapter IV: Planning (Simulated)"
    description = (
        f"A simulated playbook tailored for '{request.crisis_type}' crisis, "
        f"targeting audiences like {', '.join(request.target_audiences)} "
        f"against narratives such as {', '.join(request.key_narratives)}. "
        f"Modeled on military information operations doctrine. (Simulated LLM output)"
    )
    steps = [
        f"Identify and counter {request.key_narratives[0]}",
        f"Engage {request.target_audiences[0]} with positive messaging",
        f"Monitor {request.adversary_profiles[0]} activities",
        "Assess impact and adapt strategy",
    ]
    metrics_of_effectiveness = ["Narrative adoption rate", "Sentiment shift in target audience"]
    metrics_of_performance = ["Number of messages disseminated", "Reach of counter-narratives"]

    # Example of calling a local LLM (if llm_pipeline was loaded)
    # prompt = f"Generate a strategic playbook for a {request.crisis_type} crisis. Target audiences: {request.target_audiences}. Key narratives: {request.key_narratives}. Adversary profiles: {request.adversary_profiles}. Reference doctrine: {request.doctrine_references}. Provide name, doctrine reference, description, steps, MOEs, MOPs."
    # llm_output = llm_pipeline(prompt, max_new_tokens=500)[0]['generated_text']
    # Parse llm_output to extract playbook details

    return {
        "name": name,
        "doctrine_reference": doctrine_reference,
        "description": description,
        "steps": steps,
        "metrics_of_effectiveness": metrics_of_effectiveness,
        "metrics_of_performance": metrics_of_performance,
    }
from datetime import datetime, timedelta
from hashlib import sha1
from typing import List

from intelgraph_ai_ml.graph_forecaster import GraphForecaster, EdgePrediction
from prometheus_client import Counter, Histogram

# Metrics
forecast_latency = Histogram("forecast_latency_seconds", "Time spent generating forecasts")
forecast_cache_hits = Counter("forecast_cache_hits_total", "Number of cache hits for forecasts")
forecast_requests = Counter("forecast_requests_total", "Number of forecast requests")


class ForecastRequest(BaseModel):
    entity_id: str
    past_window: int = 14
    future_window: int = 30


class ForecastEdge(BaseModel):
    source: str
    target: str
    timestamp: datetime
    confidence: float


class ForecastResponse(BaseModel):
    edges: List[ForecastEdge]


@app.post("/forecast/graph", response_model=ForecastResponse)
def forecast_graph(req: ForecastRequest) -> ForecastResponse:
    """Predict future edges for an entity.

    The results are cached in Redis keyed by a hash of the request
    parameters.  Prometheus metrics record basic usage statistics.
    """

    forecast_requests.inc()
    request_hash = sha1(f"{req.entity_id}-{req.past_window}-{req.future_window}".encode()).hexdigest()
    if redis_client:
        cached = redis_client.get(request_hash)
        if cached:
            forecast_cache_hits.inc()
            return ForecastResponse.parse_raw(cached)

    start = time.time()
    forecaster = GraphForecaster()
    # Placeholder: in a real system we'd pull a subgraph from Neo4j using
    # ``req.entity_id`` and ``req.past_window``.  For now we ingest a
    # single self-edge so the predictor has something to work with.
    forecaster.ingest_subgraph([(req.entity_id, req.entity_id, datetime.utcnow())])
    predictions: List[EdgePrediction] = forecaster.predict_edges(req.future_window)
    response = ForecastResponse(
        edges=[
            ForecastEdge(source=p.source, target=p.target, timestamp=p.timestamp, confidence=p.confidence)
            for p in predictions
        ]
    )
    if redis_client:
        redis_client.setex(request_hash, timedelta(hours=1), response.json())
    forecast_latency.observe(time.time() - start)
    return response
