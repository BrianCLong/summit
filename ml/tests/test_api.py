"""
Test cases for the FastAPI ML service endpoints
"""
import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from ml.app.main import api

client = TestClient(api)


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_endpoint(self):
        """Test the health endpoint returns OK"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestMLEndpoints:
    """Test ML processing endpoints"""
    
    def setUp(self):
        """Setup test environment"""
        self.jwt_token = "Bearer test-token"
        self.valid_headers = {"Authorization": self.jwt_token}
    
    @patch('ml.app.main.verify_token')
    @patch('ml.app.tasks.task_nlp_entities.delay')
    def test_nlp_entities_endpoint(self, mock_task, mock_verify):
        """Test NLP entity extraction endpoint"""
        mock_verify.return_value = {"sub": "test-user"}
        mock_task.return_value = MagicMock(id="test-task-id")
        
        payload = {
            "docs": [
                {"id": "doc1", "text": "John Doe works at Acme Corp"},
                {"id": "doc2", "text": "Contact info: john@example.com"}
            ],
            "language": "en",
            "job_id": "test-job-1"
        }
        
        response = client.post(
            "/nlp/entities",
            json=payload,
            headers=self.valid_headers
        )
        
        assert response.status_code == 200
        assert response.json() == {"queued": True, "task_id": "test-task-id"}
        mock_task.assert_called_once()
    
    @patch('ml.app.main.verify_token')
    @patch('ml.app.tasks.task_entity_resolution.delay')
    def test_entity_resolution_endpoint(self, mock_task, mock_verify):
        """Test entity resolution endpoint"""
        mock_verify.return_value = {"sub": "test-user"}
        mock_task.return_value = MagicMock(id="test-task-id")
        
        payload = {
            "records": [
                {"id": "1", "name": "John Smith", "attrs": {"email": "john@example.com"}},
                {"id": "2", "name": "J. Smith", "attrs": {"phone": "555-1234"}}
            ],
            "threshold": 0.85,
            "job_id": "test-job-2"
        }
        
        response = client.post(
            "/er/resolve",
            json=payload,
            headers=self.valid_headers
        )
        
        assert response.status_code == 200
        assert response.json() == {"queued": True, "task_id": "test-task-id"}
        mock_task.assert_called_once()
    
    @patch('ml.app.main.verify_token')
    @patch('ml.app.tasks.task_link_prediction.delay')
    def test_link_prediction_endpoint(self, mock_task, mock_verify):
        """Test link prediction endpoint"""
        mock_verify.return_value = {"sub": "test-user"}
        mock_task.return_value = MagicMock(id="test-task-id")
        
        payload = {
            "graph_snapshot_id": "snapshot-123",
            "top_k": 25,
            "job_id": "test-job-3"
        }
        
        response = client.post(
            "/graph/link_predict",
            json=payload,
            headers=self.valid_headers
        )
        
        assert response.status_code == 200
        assert response.json() == {"queued": True, "task_id": "test-task-id"}
        mock_task.assert_called_once()
    
    @patch('ml.app.main.verify_token')
    @patch('ml.app.tasks.task_community_detect.delay')
    def test_community_detection_endpoint(self, mock_task, mock_verify):
        """Test community detection endpoint"""
        mock_verify.return_value = {"sub": "test-user"}
        mock_task.return_value = MagicMock(id="test-task-id")
        
        payload = {
            "graph_snapshot_id": "snapshot-123",
            "job_id": "test-job-4"
        }
        
        response = client.post(
            "/graph/community_detect",
            json=payload,
            headers=self.valid_headers
        )
        
        assert response.status_code == 200
        assert response.json() == {"queued": True, "task_id": "test-task-id"}
        mock_task.assert_called_once()
    
    def test_unauthorized_access(self):
        """Test endpoints require authentication"""
        payload = {"docs": [{"id": "1", "text": "test"}]}
        
        # No authorization header
        response = client.post("/nlp/entities", json=payload)
        assert response.status_code == 422  # Missing header
        
        # Invalid authorization header
        response = client.post(
            "/nlp/entities", 
            json=payload,
            headers={"Authorization": "InvalidToken"}
        )
        assert response.status_code == 401
    
    def test_invalid_payload(self):
        """Test endpoints validate input"""
        # Missing required fields
        response = client.post(
            "/nlp/entities",
            json={},
            headers=self.valid_headers
        )
        assert response.status_code == 422

class TestContracts:
    @patch('ml.app.main.verify_token')
    @patch('ml.app.tasks.gnn_tasks.task_gnn_link_prediction.delay')
    def test_suggest_links_contract(self, mock_task, mock_verify):
        mock_verify.return_value = {"sub": "tester"}
        mock_task.return_value = MagicMock(id="gnn-task-1")
        payload = {
            "graph": {"edges": [["1","2"],["2","3"]]},
            "model_name": "lp-model",
            "model_version": "v1",
            "top_k": 10
        }
        r = client.post('/suggestLinks', json=payload, headers={"Authorization":"Bearer t"})
        assert r.status_code == 200
        assert r.json()["queued"] is True
        assert r.json()["task_id"] == "gnn-task-1"

    @patch('ml.app.main.verify_token')
    @patch('ml.app.tasks.gnn_tasks.task_gnn_anomaly_detection.delay')
    def test_detect_anomalies_contract(self, mock_task, mock_verify):
        mock_verify.return_value = {"sub": "tester"}
        mock_task.return_value = MagicMock(id="gnn-task-2")
        payload = {
            "graph": {"edges": [["1","2"],["2","3"]]},
            "model_name": "ad-model",
            "anomaly_threshold": 0.6
        }
        r = client.post('/detectAnomalies', json=payload, headers={"Authorization":"Bearer t"})
        assert r.status_code == 200
        assert r.json()["queued"] is True
        assert r.json()["task_id"] == "gnn-task-2"
        
        # Invalid field types
        response = client.post(
            "/er/resolve",
            json={"records": "not-a-list", "threshold": "not-a-number"},
            headers=self.valid_headers
        )
        assert response.status_code == 422


class TestAuthenticationFlow:
    """Test JWT authentication and security"""
    
    @patch('app.main.jwt.decode')
    def test_valid_jwt_token(self, mock_decode):
        """Test valid JWT token processing"""
        mock_decode.return_value = {"sub": "user123", "roles": ["analyst"]}
        
        from ml.app.main import verify_token
        result = verify_token("Bearer valid-token")
        
        assert result["sub"] == "user123"
        assert result["roles"] == ["analyst"]
    
    @patch('app.main.jwt.decode')
    def test_invalid_jwt_token(self, mock_decode):
        """Test invalid JWT token handling"""
        from jose import JWTError
        mock_decode.side_effect = JWTError("Invalid token")
        
        from ml.app.main import verify_token
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token("Bearer invalid-token")
        
        assert exc_info.value.status_code == 401
    
    def test_malformed_authorization_header(self):
        """Test malformed authorization header"""
        from ml.app.main import verify_token
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException):
            verify_token("InvalidFormat")
        
        with pytest.raises(HTTPException):
            verify_token("NotBearer token")


if __name__ == "__main__":
    pytest.main([__file__])
