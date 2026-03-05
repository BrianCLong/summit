import os

filepath = "services/rag/src/main.py"
with open(filepath, "r") as f:
    content = f.read()

# Import
content = content.replace(
    "from fastapi.middleware.cors import CORSMiddleware\nfrom pydantic import BaseModel, Field",
    "from fastapi.middleware.cors import CORSMiddleware\nfrom prometheus_fastapi_instrumentator import Instrumentator\nfrom pydantic import BaseModel, Field"
)

# Instrument
content = content.replace(
    '    lifespan=lifespan,\n)\n\n# CORS middleware',
    '    lifespan=lifespan,\n)\n\n# Prometheus instrumentation\nInstrumentator().instrument(app).expose(app)\n\n# CORS middleware'
)

# Endpoint
endpoint_code = """
@app.get("/rag-health")
async def rag_health_check():
    \"\"\"Extended health check for dashboard\"\"\"
    return {
        "status": "healthy",
        "service": "rag",
        "collection_size": collection.count() if collection else 0,
        "embedding_model": "all-MiniLM-L6-v2" if embedding_model else "unavailable",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "redis": redis_client is not None,
            "postgres": postgres_pool is not None,
            "chroma": collection is not None
        }
    }


@app.get("/health")"""

content = content.replace('@app.get("/health")', endpoint_code)

with open(filepath, "w") as f:
    f.write(content)
