from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from summit.cache.redis_client import RedisClient
import os
import configparser
from functools import lru_cache

router = APIRouter(tags=["Health"])

@lru_cache()
def get_db_engine() -> Engine:
    # Priority: Env var, then alembic.ini
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        try:
            config = configparser.ConfigParser()
            # Try multiple locations for alembic.ini
            config_locations = ["summit/alembic.ini", "alembic.ini"]
            for loc in config_locations:
                if os.path.exists(loc):
                    config.read(loc)
                    db_url = config.get("alembic", "sqlalchemy.url")
                    break
        except Exception:
            pass

    if not db_url:
        db_url = "sqlite:///summit.db" # Default Fallback

    return create_engine(db_url, pool_pre_ping=True)

@router.get("/live")
async def live():
    return {"status": "alive"}

@router.get("/ready")
@router.get("/health")
async def health():
    health_status = {
        "status": "healthy",
        "dependencies": {
            "database": "unknown",
            "redis": "unknown"
        }
    }

    # Redis Check
    try:
        redis_client = RedisClient(partition="cache")
        # RedisClient might be disabled via feature flag
        if not hasattr(redis_client, 'enabled') or redis_client.enabled:
            if redis_client.ping():
                health_status["dependencies"]["redis"] = "up"
            else:
                health_status["dependencies"]["redis"] = "down"
                health_status["status"] = "unhealthy"
        else:
            health_status["dependencies"]["redis"] = "disabled"
    except Exception as e:
        health_status["dependencies"]["redis"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    # DB Check
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health_status["dependencies"]["database"] = "up"
    except Exception as e:
        health_status["dependencies"]["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    if health_status["status"] != "healthy":
        raise HTTPException(status_code=503, detail=health_status)

    return health_status
