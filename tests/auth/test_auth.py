import pytest
from datetime import datetime, timedelta, timezone
import json
import base64
import hmac
import hashlib

# Implement a simple mock JWT for testing without external dependencies
class MockJWT:
    @staticmethod
    def encode(payload, secret, algorithm="HS256"):
        header = {"alg": algorithm, "typ": "JWT"}
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')

        signature_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(secret.encode(), signature_input.encode(), hashlib.sha256).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')

        return f"{signature_input}.{signature_b64}"

    @staticmethod
    def decode(token, secret, algorithms=None):
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("invalid token")

        header_b64, payload_b64, signature_b64 = parts

        # Verify signature
        signature_input = f"{header_b64}.{payload_b64}"
        expected_signature = hmac.new(secret.encode(), signature_input.encode(), hashlib.sha256).digest()
        expected_signature_b64 = base64.urlsafe_b64encode(expected_signature).decode().rstrip('=')

        if signature_b64 != expected_signature_b64:
            raise ValueError("invalid token")

        # Add padding back and decode payload
        padding = '=' * (4 - len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64 + padding).decode()
        payload = json.loads(payload_json)

        # Check expiration
        if 'exp' in payload and payload['exp'] < datetime.now(timezone.utc).timestamp():
            raise TimeoutError("expired")

        return payload

# Mock Auth Backend
class MockAuthBackend:
    def __init__(self):
        self.api_keys = {
            "valid_key": {"status": "active", "rate_limit": 100},
            "expired_key": {"status": "expired", "rate_limit": 100},
            "revoked_key": {"status": "revoked", "rate_limit": 100}
        }
        self.users = {
            "admin_user": {"role": "admin", "permissions": ["read", "write", "delete"]},
            "writer_user": {"role": "writer", "permissions": ["read", "write"]},
            "reader_user": {"role": "reader", "permissions": ["read"]}
        }
        self.jwt_secret = "test_secret"
        self.rate_limits = {}
        self.audit_logs = []

    def validate_api_key(self, api_key):
        self.log_audit_event("validate_api_key", api_key=api_key)
        if api_key not in self.api_keys:
            return {"valid": False, "reason": "wrong format or not found"}
        key_info = self.api_keys[api_key]
        if key_info["status"] != "active":
            return {"valid": False, "reason": key_info["status"]}
        return {"valid": True, "reason": "valid"}

    def generate_jwt(self, user_id):
        self.log_audit_event("generate_jwt", user_id=user_id)
        if user_id not in self.users:
            return None
        payload = {
            "user_id": user_id,
            "role": self.users[user_id]["role"],
            "exp": (datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()
        }
        return MockJWT.encode(payload, self.jwt_secret)

    def validate_jwt(self, token):
        self.log_audit_event("validate_jwt", token_length=len(token) if token else 0)
        try:
            payload = MockJWT.decode(token, self.jwt_secret)
            return {"valid": True, "payload": payload}
        except TimeoutError:
            return {"valid": False, "reason": "expired"}
        except ValueError:
            return {"valid": False, "reason": "invalid token"}
        except Exception:
            return {"valid": False, "reason": "invalid token"}

    def check_permission(self, user_id, action):
        self.log_audit_event("check_permission", user_id=user_id, action_performed=action)
        if user_id not in self.users:
            return False
        return action in self.users[user_id]["permissions"]

    def enforce_rate_limit(self, api_key):
        self.log_audit_event("enforce_rate_limit", api_key=api_key)
        if api_key not in self.api_keys:
            return False
        limit = self.api_keys[api_key]["rate_limit"]
        current = self.rate_limits.get(api_key, 0)
        if current >= limit:
            return False
        self.rate_limits[api_key] = current + 1
        return True

    def refresh_token(self, token):
        self.log_audit_event("refresh_token")
        val_res = self.validate_jwt(token)
        if not val_res["valid"]:
            return None
        return self.generate_jwt(val_res["payload"]["user_id"])

    def log_audit_event(self, action, **kwargs):
        self.audit_logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "details": kwargs
        })

@pytest.fixture
def auth_backend():
    return MockAuthBackend()

def test_api_key_valid(auth_backend):
    result = auth_backend.validate_api_key("valid_key")
    assert result["valid"] is True

def test_api_key_expired(auth_backend):
    result = auth_backend.validate_api_key("expired_key")
    assert result["valid"] is False
    assert result["reason"] == "expired"

def test_api_key_revoked(auth_backend):
    result = auth_backend.validate_api_key("revoked_key")
    assert result["valid"] is False
    assert result["reason"] == "revoked"

def test_api_key_wrong_format(auth_backend):
    result = auth_backend.validate_api_key("invalid_format_key_123")
    assert result["valid"] is False
    assert result["reason"] == "wrong format or not found"

def test_jwt_generation_and_validation(auth_backend):
    token = auth_backend.generate_jwt("admin_user")
    assert token is not None

    val_result = auth_backend.validate_jwt(token)
    assert val_result["valid"] is True
    assert val_result["payload"]["user_id"] == "admin_user"
    assert val_result["payload"]["role"] == "admin"

def test_jwt_invalid_token(auth_backend):
    val_result = auth_backend.validate_jwt("invalid.token.string")
    assert val_result["valid"] is False
    assert val_result["reason"] == "invalid token"

def test_jwt_expired_token(auth_backend):
    # Create an expired token manually for testing
    payload = {
        "user_id": "admin_user",
        "role": "admin",
        "exp": (datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()
    }
    expired_token = MockJWT.encode(payload, auth_backend.jwt_secret)

    val_result = auth_backend.validate_jwt(expired_token)
    assert val_result["valid"] is False
    assert val_result["reason"] == "expired"

def test_rbac_admin(auth_backend):
    assert auth_backend.check_permission("admin_user", "read") is True
    assert auth_backend.check_permission("admin_user", "write") is True
    assert auth_backend.check_permission("admin_user", "delete") is True

def test_rbac_writer(auth_backend):
    assert auth_backend.check_permission("writer_user", "read") is True
    assert auth_backend.check_permission("writer_user", "write") is True
    assert auth_backend.check_permission("writer_user", "delete") is False

def test_rbac_reader(auth_backend):
    assert auth_backend.check_permission("reader_user", "read") is True
    assert auth_backend.check_permission("reader_user", "write") is False
    assert auth_backend.check_permission("reader_user", "delete") is False

def test_rbac_unknown_user(auth_backend):
    assert auth_backend.check_permission("unknown_user", "read") is False

def test_rate_limiting(auth_backend):
    # Set limit to 2 for easier testing
    auth_backend.api_keys["valid_key"]["rate_limit"] = 2

    # First request
    assert auth_backend.enforce_rate_limit("valid_key") is True

    # Second request
    assert auth_backend.enforce_rate_limit("valid_key") is True

    # Third request (should be blocked)
    assert auth_backend.enforce_rate_limit("valid_key") is False

def test_rate_limiting_invalid_key(auth_backend):
    assert auth_backend.enforce_rate_limit("invalid_key") is False

def test_token_refresh_flow(auth_backend):
    token = auth_backend.generate_jwt("reader_user")

    # Refresh the token
    new_token = auth_backend.refresh_token(token)
    assert new_token is not None
    assert new_token != token

    # Validate new token
    val_result = auth_backend.validate_jwt(new_token)
    assert val_result["valid"] is True
    assert val_result["payload"]["user_id"] == "reader_user"

def test_token_refresh_invalid(auth_backend):
    new_token = auth_backend.refresh_token("invalid.token.string")
    assert new_token is None

def test_audit_logs(auth_backend):
    auth_backend.validate_api_key("valid_key")
    auth_backend.generate_jwt("admin_user")

    logs = auth_backend.audit_logs
    assert len(logs) == 2
    assert logs[0]["action"] == "validate_api_key"
    assert logs[0]["details"]["api_key"] == "valid_key"
    assert logs[1]["action"] == "generate_jwt"
    assert logs[1]["details"]["user_id"] == "admin_user"
