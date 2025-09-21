"""
Tests for ML service monitoring and observability
"""
import pytest
import time
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import api
from app.monitoring import (
    track_http_request,
    track_ml_prediction,
    track_task_processing,
    track_entity_extraction,
    track_error,
    get_metrics,
    health_checker
)


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(api)


class TestMonitoringEndpoints:
    """Test monitoring endpoints"""
    
    def test_metrics_endpoint(self, client):
        """Test Prometheus metrics endpoint"""
        response = client.get("/metrics")
        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]
        
        # Should contain Prometheus metrics format
        content = response.text
        assert "# HELP" in content
        assert "# TYPE" in content
        
        # Should contain custom metrics
        assert "http_requests_total" in content
        assert "ml_model_predictions_total" in content
        assert "tasks_processed_total" in content
    
    def test_health_endpoint(self, client):
        """Test comprehensive health check"""
        response = client.get("/health")
        assert response.status_code in [200, 503]
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "checks" in data
        
        checks = data["checks"]
        assert "redis" in checks
        assert "system_resources" in checks
        assert "ml_models" in checks
    
    def test_health_quick_endpoint(self, client):
        """Test quick health check (cached)"""
        response = client.get("/health/quick")
        assert response.status_code in [200, 503]
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
    
    def test_health_live_endpoint(self, client):
        """Test liveness probe"""
        response = client.get("/health/live")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "alive"
        assert "uptime_seconds" in data
        assert "pid" in data
        assert "timestamp" in data
    
    def test_health_ready_endpoint(self, client):
        """Test readiness probe"""
        response = client.get("/health/ready")
        assert response.status_code in [200, 503]
        
        data = response.json()
        assert data["status"] in ["ready", "not_ready"]
        assert "checks" in data
    
    def test_health_info_endpoint(self, client):
        """Test service information"""
        response = client.get("/health/info")
        assert response.status_code == 200
        
        data = response.json()
        assert data["service"] == "intelgraph-ml"
        assert "version" in data
        assert "python_version" in data
        assert "uptime_seconds" in data
        assert "memory_mb" in data


class TestMetricsTracking:
    """Test metrics tracking functions"""
    
    def test_track_http_request(self):
        """Test HTTP request tracking"""
        # This would increment counters and histograms
        track_http_request(
            method="GET",
            endpoint="/test",
            status_code=200,
            duration=0.5
        )
        
        # Verify metrics are recorded
        metrics_output = get_metrics()
        assert b"http_requests_total" in metrics_output
        assert b"http_request_duration_seconds" in metrics_output
    
    def test_track_ml_prediction(self):
        """Test ML prediction tracking"""
        track_ml_prediction(
            model_type="entity_resolver",
            duration=2.5,
            status="success"
        )
        
        metrics_output = get_metrics()
        assert b"ml_model_predictions_total" in metrics_output
        assert b"ml_model_inference_duration_seconds" in metrics_output
    
    def test_track_task_processing(self):
        """Test task processing tracking"""
        track_task_processing(
            task_type="nlp_entities",
            duration=10.0,
            status="success"
        )
        
        metrics_output = get_metrics()
        assert b"tasks_processed_total" in metrics_output
        assert b"task_processing_duration_seconds" in metrics_output
    
    def test_track_entity_extraction(self):
        """Test entity extraction tracking"""
        track_entity_extraction(
            source="spacy",
            entity_type="PERSON",
            confidence=0.95
        )
        
        metrics_output = get_metrics()
        assert b"entities_extracted_total" in metrics_output
        assert b"entity_extraction_confidence" in metrics_output
    
    def test_track_error(self):
        """Test error tracking"""
        track_error(
            module="test_module",
            error_type="ValueError",
            severity="error"
        )
        
        metrics_output = get_metrics()
        assert b"errors_total" in metrics_output


class TestHealthChecker:
    """Test health checker functionality"""
    
    @pytest.mark.asyncio
    async def test_redis_health_check(self):
        """Test Redis health check"""
        result = await health_checker.check_redis()
        
        assert "status" in result
        assert result["status"] in ["healthy", "unhealthy"]
        
        if result["status"] == "healthy":
            assert "response_time_ms" in result
            assert "details" in result
        else:
            assert "error" in result
    
    @pytest.mark.asyncio
    async def test_neo4j_health_check(self):
        """Test Neo4j health check"""
        result = await health_checker.check_neo4j()
        
        assert "status" in result
        assert result["status"] in ["healthy", "unhealthy"]
    
    def test_system_resources_check(self):
        """Test system resources check"""
        result = health_checker.check_system_resources()
        
        assert "status" in result
        assert "memory_percent" in result
        assert "cpu_percent" in result
        assert "disk_percent" in result
        
        assert isinstance(result["memory_percent"], (int, float))
        assert isinstance(result["cpu_percent"], (int, float))
        assert isinstance(result["disk_percent"], (int, float))
    
    def test_ml_models_check(self):
        """Test ML models availability check"""
        result = health_checker.check_ml_models()
        
        assert "status" in result
        assert "models" in result
        
        models = result["models"]
        assert "entity_resolver" in models
        assert "link_predictor" in models
        assert "community_detector" in models
    
    def test_gpu_availability_check(self):
        """Test GPU availability check"""
        result = health_checker.check_gpu_availability()
        
        assert "status" in result
        assert "gpu_info" in result
        
        gpu_info = result["gpu_info"]
        assert "cuda_available" in gpu_info
        assert "device_count" in gpu_info
        assert isinstance(gpu_info["cuda_available"], bool)
        assert isinstance(gpu_info["device_count"], int)
    
    @pytest.mark.asyncio
    async def test_comprehensive_health_check(self):
        """Test comprehensive health check"""
        result = await health_checker.perform_comprehensive_health_check()
        
        assert "status" in result
        assert "timestamp" in result
        assert "response_time_seconds" in result
        assert "checks" in result
        
        checks = result["checks"]
        assert "redis" in checks
        assert "system_resources" in checks
        assert "ml_models" in checks
        assert "gpu" in checks
    
    def test_liveness_probe(self):
        """Test liveness probe"""
        result = health_checker.liveness_probe()
        
        assert result["status"] == "alive"
        assert "timestamp" in result
        assert "uptime_seconds" in result
        assert "pid" in result
    
    @pytest.mark.asyncio
    async def test_readiness_probe(self):
        """Test readiness probe"""
        result = await health_checker.readiness_probe()
        
        assert result["status"] in ["ready", "not_ready"]
        assert "timestamp" in result
        assert "checks" in result


class TestMetricsIntegration:
    """Test metrics integration with actual requests"""
    
    def test_metrics_middleware_integration(self, client):
        """Test that middleware correctly tracks requests"""
        # Make a request to trigger middleware
        response = client.get("/health/info")
        assert response.status_code == 200
        
        # Check that metrics were recorded
        metrics_response = client.get("/metrics")
        assert metrics_response.status_code == 200
        
        content = metrics_response.text
        assert "http_requests_total" in content
        assert "http_request_duration_seconds" in content
    
    def test_error_tracking_integration(self, client):
        """Test error tracking integration"""
        # Make request that might generate errors
        response = client.get("/nonexistent")
        assert response.status_code == 404
        
        # Check metrics
        metrics_response = client.get("/metrics")
        content = metrics_response.text
        assert "http_requests_total" in content


class TestPerformance:
    """Test monitoring performance"""
    
    def test_metrics_collection_performance(self):
        """Test that metrics collection is fast"""
        start_time = time.time()
        
        # Collect metrics multiple times
        for _ in range(10):
            get_metrics()
        
        duration = time.time() - start_time
        
        # Should be very fast
        assert duration < 1.0
    
    @pytest.mark.asyncio
    async def test_health_check_performance(self):
        """Test health check performance"""
        start_time = time.time()
        
        # Perform multiple health checks
        for _ in range(5):
            await health_checker.readiness_probe()
        
        duration = time.time() - start_time
        
        # Should be reasonably fast
        assert duration < 5.0
    
    def test_cached_health_status_performance(self):
        """Test cached health status performance"""
        start_time = time.time()
        
        # Get cached status multiple times
        for _ in range(100):
            health_checker.get_cached_health_status()
        
        duration = time.time() - start_time
        
        # Should be very fast for cached access
        assert duration < 0.1


class TestErrorHandling:
    """Test monitoring error handling"""
    
    @patch('app.monitoring.health.redis.Redis')
    @pytest.mark.asyncio
    async def test_redis_connection_failure(self, mock_redis):
        """Test handling of Redis connection failure"""
        mock_redis.side_effect = Exception("Connection failed")
        
        result = await health_checker.check_redis()
        
        assert result["status"] == "unhealthy"
        assert "error" in result
        assert "Connection failed" in result["error"]
    
    @patch('app.monitoring.metrics.psutil.cpu_percent')
    def test_system_metrics_error_handling(self, mock_cpu):
        """Test handling of system metrics collection errors"""
        mock_cpu.side_effect = Exception("System error")
        
        # Should not crash, should track error
        try:
            from app.monitoring.metrics import update_system_metrics
            update_system_metrics()
        except Exception:
            pytest.fail("update_system_metrics should handle errors gracefully")
    
    @pytest.mark.asyncio
    async def test_health_check_timeout_handling(self):
        """Test health check timeout handling"""
        # This would test timeout scenarios
        result = await health_checker.perform_comprehensive_health_check()
        
        # Should always return a result, even if some checks timeout
        assert "status" in result
        assert "timestamp" in result


if __name__ == "__main__":
    pytest.main([__file__])