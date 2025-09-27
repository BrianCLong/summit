"""
Health check functionality for IntelGraph ML service
"""

import asyncio
import time
from datetime import datetime
from typing import Any

import httpx
import psutil
import redis
from neo4j import GraphDatabase


class HealthChecker:
    """Health check manager for ML service"""

    def __init__(self):
        self.last_health_check = None
        self.cached_health_status = {
            "status": "unknown",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {},
        }

    async def check_redis(self) -> dict[str, Any]:
        """Check Redis connectivity"""
        try:
            import os

            redis_url = os.getenv("REDIS_URL")
            if redis_url:
                redis_client = redis.Redis.from_url(
                    redis_url,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                )
            else:
                redis_client = redis.Redis(
                    host=os.getenv("REDIS_HOST", "localhost"),
                    port=int(os.getenv("REDIS_PORT", 6379)),
                    password=os.getenv("REDIS_PASSWORD"),
                    db=int(os.getenv("REDIS_DB", 0)),
                    socket_timeout=5,
                    socket_connect_timeout=5,
                )

            start_time = time.time()
            redis_client.ping()
            response_time = (time.time() - start_time) * 1000

            redis_client.close()

            return {
                "status": "healthy",
                "response_time_ms": round(response_time, 2),
                "details": "Redis connection successful",
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "details": "Redis connection failed"}

    async def check_neo4j(self) -> dict[str, Any]:
        """Check Neo4j connectivity"""
        try:
            import os

            uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            username = os.getenv("NEO4J_USER", "neo4j")
            password = os.getenv("NEO4J_PASSWORD", "password")

            driver = GraphDatabase.driver(uri, auth=(username, password))

            start_time = time.time()
            with driver.session() as session:
                result = session.run("RETURN 1 as healthy")
                result.consume()
            response_time = (time.time() - start_time) * 1000

            driver.close()

            return {
                "status": "healthy",
                "response_time_ms": round(response_time, 2),
                "details": "Neo4j connection successful",
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "details": "Neo4j connection failed"}

    async def check_main_api(self) -> dict[str, Any]:
        """Check main API server connectivity"""
        try:
            import os

            api_url = os.getenv("MAIN_API_URL", "http://localhost:4000")

            async with httpx.AsyncClient(timeout=5.0) as client:
                start_time = time.time()
                response = await client.get(f"{api_url}/health/quick")
                response_time = (time.time() - start_time) * 1000

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": "healthy",
                        "response_time_ms": round(response_time, 2),
                        "details": "Main API reachable",
                        "api_status": data.get("status", "unknown"),
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "response_time_ms": round(response_time, 2),
                        "details": f"Main API returned {response.status_code}",
                    }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "details": "Main API unreachable"}

    def check_system_resources(self) -> dict[str, Any]:
        """Check system resource utilization"""
        try:
            # Memory check
            memory = psutil.virtual_memory()
            memory_percent = memory.percent

            # CPU check
            cpu_percent = psutil.cpu_percent(interval=1)

            # Disk check
            disk = psutil.disk_usage("/")
            disk_percent = (disk.used / disk.total) * 100

            # Determine status
            status = "healthy"
            warnings = []

            if memory_percent > 90:
                status = "unhealthy"
                warnings.append(f"High memory usage: {memory_percent:.1f}%")
            elif memory_percent > 80:
                warnings.append(f"Memory usage warning: {memory_percent:.1f}%")

            if cpu_percent > 95:
                status = "unhealthy"
                warnings.append(f"High CPU usage: {cpu_percent:.1f}%")
            elif cpu_percent > 85:
                warnings.append(f"CPU usage warning: {cpu_percent:.1f}%")

            if disk_percent > 95:
                status = "unhealthy"
                warnings.append(f"High disk usage: {disk_percent:.1f}%")

            return {
                "status": status,
                "memory_percent": round(memory_percent, 1),
                "cpu_percent": round(cpu_percent, 1),
                "disk_percent": round(disk_percent, 1),
                "warnings": warnings,
                "details": "System resources checked"
                + (f" - {len(warnings)} warnings" if warnings else ""),
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "details": "System resource check failed",
            }

    def check_ml_models(self) -> dict[str, Any]:
        """Check ML model availability and status"""
        try:
            from app.models import get_community_detector, get_entity_resolver, get_link_predictor

            models_status = {}
            overall_status = "healthy"

            # Check entity resolver
            try:
                resolver = get_entity_resolver()
                if resolver:
                    models_status["entity_resolver"] = {
                        "status": "loaded",
                        "type": (
                            "transformer"
                            if getattr(resolver, "use_transformers", False)
                            else "fallback"
                        ),
                    }
                else:
                    models_status["entity_resolver"] = {"status": "not_loaded"}
            except Exception as e:
                models_status["entity_resolver"] = {"status": "error", "error": str(e)}
                overall_status = "unhealthy"

            # Check link predictor
            try:
                predictor = get_link_predictor()
                if predictor:
                    models_status["link_predictor"] = {"status": "loaded"}
                else:
                    models_status["link_predictor"] = {"status": "not_loaded"}
            except Exception as e:
                models_status["link_predictor"] = {"status": "error", "error": str(e)}
                overall_status = "unhealthy"

            # Check community detector
            try:
                detector = get_community_detector()
                if detector:
                    models_status["community_detector"] = {"status": "loaded"}
                else:
                    models_status["community_detector"] = {"status": "not_loaded"}
            except Exception as e:
                models_status["community_detector"] = {"status": "error", "error": str(e)}
                overall_status = "unhealthy"

            return {
                "status": overall_status,
                "models": models_status,
                "details": f"ML models status checked - {overall_status}",
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "details": "ML model check failed"}

    def check_gpu_availability(self) -> dict[str, Any]:
        """Check GPU availability and status"""
        try:
            import torch

            gpu_info = {
                "cuda_available": torch.cuda.is_available(),
                "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
                "devices": [],
            }

            if torch.cuda.is_available():
                for i in range(torch.cuda.device_count()):
                    device_props = torch.cuda.get_device_properties(i)
                    memory_info = torch.cuda.mem_get_info(i)

                    gpu_info["devices"].append(
                        {
                            "id": i,
                            "name": device_props.name,
                            "memory_total_gb": round(device_props.total_memory / 1024**3, 2),
                            "memory_free_gb": round(memory_info[0] / 1024**3, 2),
                            "memory_used_gb": round(
                                (device_props.total_memory - memory_info[0]) / 1024**3, 2
                            ),
                            "compute_capability": f"{device_props.major}.{device_props.minor}",
                        }
                    )

            return {
                "status": "healthy",
                "gpu_info": gpu_info,
                "details": f'GPU check completed - {gpu_info["device_count"]} devices available',
            }
        except Exception as e:
            return {
                "status": "warning",
                "error": str(e),
                "details": "GPU check failed - may not be available",
            }

    async def perform_comprehensive_health_check(self) -> dict[str, Any]:
        """Perform comprehensive health check"""
        start_time = time.time()

        try:
            # Run all checks concurrently
            redis_check, neo4j_check, api_check = await asyncio.gather(
                self.check_redis(),
                self.check_neo4j(),
                self.check_main_api(),
                return_exceptions=True,
            )

            # Handle exceptions from async checks
            if isinstance(redis_check, Exception):
                redis_check = {"status": "unhealthy", "error": str(redis_check)}
            if isinstance(neo4j_check, Exception):
                neo4j_check = {"status": "unhealthy", "error": str(neo4j_check)}
            if isinstance(api_check, Exception):
                api_check = {"status": "unhealthy", "error": str(api_check)}

            # Run synchronous checks
            system_check = self.check_system_resources()
            models_check = self.check_ml_models()
            gpu_check = self.check_gpu_availability()

            checks = {
                "redis": redis_check,
                "neo4j": neo4j_check,
                "main_api": api_check,
                "system_resources": system_check,
                "ml_models": models_check,
                "gpu": gpu_check,
            }

            # Determine overall status
            critical_checks = ["redis", "system_resources"]
            critical_unhealthy = any(
                checks[check]["status"] == "unhealthy" for check in critical_checks
            )

            overall_status = "unhealthy" if critical_unhealthy else "healthy"

            total_time = time.time() - start_time

            health_status = {
                "status": overall_status,
                "timestamp": datetime.utcnow().isoformat(),
                "response_time_seconds": round(total_time, 3),
                "version": "0.2.0",
                "environment": "development",  # Should come from environment
                "checks": checks,
            }

            self.cached_health_status = health_status
            self.last_health_check = time.time()

            return health_status

        except Exception as e:
            error_status = {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e),
                "details": "Health check failed",
            }

            self.cached_health_status = error_status
            return error_status

    def get_cached_health_status(self) -> dict[str, Any]:
        """Get cached health status for quick responses"""
        return self.cached_health_status

    def liveness_probe(self) -> dict[str, Any]:
        """Simple liveness probe for Kubernetes"""
        return {
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": round(time.time() - psutil.Process().create_time()),
            "pid": psutil.Process().pid,
        }

    async def readiness_probe(self) -> dict[str, Any]:
        """Readiness probe for Kubernetes"""
        try:
            # Quick checks for critical dependencies
            redis_check = await self.check_redis()
            system_check = self.check_system_resources()

            ready = redis_check["status"] == "healthy" and system_check["status"] in [
                "healthy",
                "warning",
            ]

            return {
                "status": "ready" if ready else "not_ready",
                "timestamp": datetime.utcnow().isoformat(),
                "checks": {"redis": redis_check["status"], "system": system_check["status"]},
            }
        except Exception as e:
            return {
                "status": "not_ready",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e),
            }


# Global health checker instance
health_checker = HealthChecker()
