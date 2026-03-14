from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from summit.cache.redis_client import RedisClient
import os
import configparser
import logging
from functools import lru_cache
from pathlib import Path

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)

@lru_cache()
def get_db_engine() -> Engine:
    """
    Creates and caches a SQLAlchemy engine for health checks.
    Priority: DATABASE_URL env var, then alembic.ini discovery.
    """
    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        # Robust discovery of alembic.ini
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        config_locations = [
            base_dir / "summit" / "alembic.ini",
            base_dir / "alembic.ini",
            Path("summit/alembic.ini"),
            Path("alembic.ini")
        ]

        for loc in config_locations:
            if loc.exists():
                try:
                    config = configparser.ConfigParser()
                    config.read(loc)
                    if config.has_section("alembic"):
                        db_url = config.get("alembic", "sqlalchemy.url")
                        if db_url:
                            logger.info(f"Discovered database URL from {loc}")
                            break
                except Exception as e:
                    logger.debug(f"Failed to read config from {loc}: {e}")

    if not db_url:
        logger.warning("No database configuration found. Falling back to SQLite for health checks.")
        db_url = "sqlite:///summit.db"

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
