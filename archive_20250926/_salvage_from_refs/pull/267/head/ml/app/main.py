import os, json, time
from fastapi import FastAPI, Depends, HTTPException, Header, Request, Response
from fastapi.responses import PlainTextResponse
from jose import jwt
import httpx
from .schemas import NLPRequest, ERRequest, LinkPredRequest, CommunityRequest
from .tasks import task_nlp_entities, task_entity_resolution, task_link_prediction, task_community_detect
from .tasks.gnn_tasks import (
    task_gnn_node_classification,
    task_gnn_link_prediction,
    task_gnn_graph_classification,
    task_gnn_anomaly_detection,
    task_gnn_generate_embeddings
)
from .security import sign_payload
from .monitoring import (
    track_http_request, 
    track_ml_prediction, 
    get_metrics, 
    get_content_type,
    health_checker
)

JWT_PUBLIC_KEY = os.getenv("JWT_PUBLIC_KEY", "")
JWT_ALGO = "RS256"

def verify_token(authorization: str = Header(...)):
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError("invalid scheme")
        payload = jwt.decode(token, JWT_PUBLIC_KEY, algorithms=[JWT_ALGO])
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {e}")

api = FastAPI(title="IntelGraph ML Service", version="0.2.0")

# Middleware for tracking HTTP requests
@api.middleware("http")
async def track_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    # Track metrics
    track_http_request(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code,
        duration=duration
    )
    
    return response

# Monitoring endpoints
@api.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    metrics_data = get_metrics()
    return PlainTextResponse(
        content=metrics_data,
        media_type=get_content_type()
    )

@api.get("/health")
async def health():
    """Comprehensive health check"""
    health_status = await health_checker.perform_comprehensive_health_check()
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return Response(
        content=json.dumps(health_status),
        status_code=status_code,
        media_type="application/json"
    )

@api.get("/health/quick")
async def health_quick():
    """Quick health check (cached)"""
    health_status = health_checker.get_cached_health_status()
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return Response(
        content=json.dumps(health_status),
        status_code=status_code,
        media_type="application/json"
    )

@api.get("/health/live")
async def health_live():
    """Kubernetes liveness probe"""
    liveness_status = health_checker.liveness_probe()
    return liveness_status

@api.get("/health/ready")
async def health_ready():
    """Kubernetes readiness probe"""
    readiness_status = await health_checker.readiness_probe()
    status_code = 200 if readiness_status['status'] == 'ready' else 503
    return Response(
        content=json.dumps(readiness_status),
        status_code=status_code,
        media_type="application/json"
    )

@api.get("/health/info")
async def health_info():
    """Service information"""
    import platform
    import psutil
    
    process = psutil.Process()
    
    info = {
        'service': 'intelgraph-ml',
        'version': '0.2.0',
        'environment': os.getenv('ENVIRONMENT', 'development'),
        'python_version': platform.python_version(),
        'platform': platform.platform(),
        'uptime_seconds': round(time.time() - process.create_time()),
        'timestamp': time.time(),
        'pid': process.pid,
        'memory_mb': round(process.memory_info().rss / 1024 / 1024),
    }
    
    return info

async def _maybe_webhook(callback_url: str, result: dict):
    if not callback_url:
        return
    body = json.dumps(result).encode()
    sig = sign_payload(body)
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(callback_url, content=body, headers={"X-IntelGraph-Signature": sig, "Content-Type": "application/json"})

@api.post("/nlp/entities")
async def nlp_entities(req: NLPRequest, _=Depends(verify_token)):
    t = task_nlp_entities.delay(req.model_dump())
    return {"queued": True, "task_id": t.id}

@api.post("/er/resolve")
async def entity_resolution(req: ERRequest, _=Depends(verify_token)):
    t = task_entity_resolution.delay(req.model_dump())
    return {"queued": True, "task_id": t.id}

@api.post("/graph/link_predict")
async def link_predict(req: LinkPredRequest, _=Depends(verify_token)):
    t = task_link_prediction.delay(req.model_dump())
    return {"queued": True, "task_id": t.id}

@api.post("/graph/community_detect")
async def community_detect(req: CommunityRequest, _=Depends(verify_token)):
    t = task_community_detect.delay(req.model_dump())
    return {"queued": True, "task_id": t.id}

# GNN Endpoints
@api.post("/gnn/node_classification")
async def gnn_node_classification(request: dict, _=Depends(verify_token)):
    """Queue GNN node classification task"""
    t = task_gnn_node_classification.delay(request)
    return {"queued": True, "task_id": t.id}

@api.post("/gnn/link_prediction")
async def gnn_link_prediction(request: dict, _=Depends(verify_token)):
    """Queue GNN link prediction task"""
    t = task_gnn_link_prediction.delay(request)
    return {"queued": True, "task_id": t.id}

@api.post("/gnn/graph_classification")
async def gnn_graph_classification(request: dict, _=Depends(verify_token)):
    """Queue GNN graph classification task"""
    t = task_gnn_graph_classification.delay(request)
    return {"queued": True, "task_id": t.id}

@api.post("/gnn/anomaly_detection")
async def gnn_anomaly_detection(request: dict, _=Depends(verify_token)):
    """Queue GNN anomaly detection task"""
    t = task_gnn_anomaly_detection.delay(request)
    return {"queued": True, "task_id": t.id}

@api.post("/gnn/generate_embeddings")
async def gnn_generate_embeddings(request: dict, _=Depends(verify_token)):
    """Queue GNN embedding generation task"""
    t = task_gnn_generate_embeddings.delay(request)
    return {"queued": True, "task_id": t.id}

@api.get("/gnn/models")
async def list_gnn_models(_=Depends(verify_token)):
    """List available GNN models"""
    from .models.gnn import gnn_manager
    
    models = gnn_manager.list_models()
    model_info = {}
    
    for model_name in models:
        info = gnn_manager.get_model_info(model_name)
        if info:
            model_info[model_name] = info
    
    return {
        "models": model_info,
        "count": len(models)
    }

@api.get("/gnn/models/{model_name}")
async def get_gnn_model_info(model_name: str, _=Depends(verify_token)):
    """Get information about a specific GNN model"""
    from .models.gnn import gnn_manager
    
    info = gnn_manager.get_model_info(model_name)
    if info is None:
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    
    return info

@api.delete("/gnn/models/{model_name}")
async def delete_gnn_model(model_name: str, _=Depends(verify_token)):
    """Delete a GNN model"""
    from .models.gnn import gnn_manager
    
    if model_name not in gnn_manager.list_models():
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    
    gnn_manager.delete_model(model_name)
    return {"deleted": True, "model_name": model_name}