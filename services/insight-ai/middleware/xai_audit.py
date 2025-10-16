"""
XAI Audit Middleware for AI Insights Service
GREEN TRAIN Week-4 Hardening: Comprehensive explainability and audit logging
"""

import json
import time
import uuid
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from opentelemetry import trace
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class XAIAuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware for capturing AI inference artifacts with explainability support.

    Features:
    - Model parameter and configuration capture
    - Inference timeline tracking
    - Feature importance logging
    - Explanation hook generation
    - Audit trail maintenance
    """

    def __init__(
        self,
        app,
        artifact_store_path: str = "/var/run/ai-artifacts",
        enable_feature_capture: bool = True,
        max_artifact_size_mb: int = 10,
        retention_days: int = 30,
    ):
        super().__init__(app)
        self.store_path = Path(artifact_store_path)
        self.store_path.mkdir(parents=True, exist_ok=True)
        self.enable_feature_capture = enable_feature_capture
        self.max_artifact_size_mb = max_artifact_size_mb
        self.retention_days = retention_days
        self.tracer = trace.get_tracer(__name__)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only process AI insights endpoints
        if not self._should_audit(request):
            return await call_next(request)

        # Generate artifact ID and start audit record
        artifact_id = str(uuid.uuid4())
        start_time = datetime.now(timezone.utc)

        audit_record = {
            "artifact_id": artifact_id,
            "request_id": request.headers.get("x-request-id", "unknown"),
            "timestamp": start_time.isoformat(),
            "endpoint": request.url.path,
            "method": request.method,
            "user_agent": request.headers.get("user-agent", "unknown"),
            "client_ip": self._get_client_ip(request),
            "model_metadata": self._extract_model_metadata(request),
            "inference_params": self._extract_inference_params(request),
            "feature_flags": self._extract_feature_flags(request),
        }

        # Start OpenTelemetry span for tracing
        with self.tracer.start_as_current_span(
            "ai_inference_audit",
            attributes={
                "ai.artifact_id": artifact_id,
                "ai.endpoint": request.url.path,
                "ai.model": audit_record["model_metadata"].get("name", "unknown"),
            },
        ) as span:

            try:
                # Capture request features if enabled
                if self.enable_feature_capture:
                    audit_record["input_features"] = await self._capture_input_features(request)

                # Process the request
                response = await call_next(request)

                # Capture response and inference results
                audit_record.update(
                    {
                        "end_timestamp": datetime.now(timezone.utc).isoformat(),
                        "duration_ms": (datetime.now(timezone.utc) - start_time).total_seconds()
                        * 1000,
                        "status_code": response.status_code,
                        "response_size_bytes": (
                            len(response.body) if hasattr(response, "body") else 0
                        ),
                    }
                )

                # Extract model outputs and confidence scores
                if response.status_code == 200:
                    audit_record["inference_results"] = await self._extract_inference_results(
                        response
                    )
                    audit_record["confidence_scores"] = await self._extract_confidence_scores(
                        response
                    )
                    audit_record["feature_importance"] = await self._calculate_feature_importance(
                        audit_record.get("input_features", {}),
                        audit_record.get("inference_results", {}),
                    )

                # Generate explanation hooks
                audit_record["explanation_hooks"] = {
                    "explain_url": f"/api/insights/{artifact_id}/explain",
                    "feature_importance_url": f"/api/insights/{artifact_id}/features",
                    "model_card_url": f"/api/insights/{artifact_id}/model-card",
                    "replay_url": f"/api/insights/{artifact_id}/replay",
                }

                # Add trace context
                span_context = span.get_span_context()
                audit_record["trace_context"] = {
                    "trace_id": format(span_context.trace_id, "032x"),
                    "span_id": format(span_context.span_id, "016x"),
                    "trace_flags": span_context.trace_flags,
                }

                # Store audit record
                await self._store_audit_record(artifact_id, audit_record)

                # Add audit headers to response
                response.headers["x-ai-artifact-id"] = artifact_id
                response.headers["x-ai-explain-url"] = audit_record["explanation_hooks"][
                    "explain_url"
                ]
                response.headers["x-ai-trace-id"] = audit_record["trace_context"]["trace_id"]

                # Update span with results
                span.set_attributes(
                    {
                        "ai.inference.duration_ms": audit_record["duration_ms"],
                        "ai.inference.status": (
                            "success" if response.status_code == 200 else "error"
                        ),
                        "ai.inference.confidence": audit_record.get("confidence_scores", {}).get(
                            "average", 0
                        ),
                    }
                )

                return response

            except Exception as e:
                # Log error and continue
                audit_record.update(
                    {
                        "end_timestamp": datetime.now(timezone.utc).isoformat(),
                        "error": str(e),
                        "status": "failed",
                    }
                )

                span.set_attributes({"ai.inference.status": "error", "ai.error.message": str(e)})

                await self._store_audit_record(artifact_id, audit_record)
                raise

    def _should_audit(self, request: Request) -> bool:
        """Determine if request should be audited based on path and headers."""
        audit_paths = ["/api/insights/entity-resolution", "/api/insights/link-scoring"]
        return any(request.url.path.startswith(path) for path in audit_paths)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP with proxy header support."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _extract_model_metadata(self, request: Request) -> dict[str, Any]:
        """Extract model metadata from request headers."""
        return {
            "name": request.headers.get("x-model-name", "unknown"),
            "version": request.headers.get("x-model-version", "unknown"),
            "framework": request.headers.get("x-model-framework", "pytorch"),
            "parameters": self._safe_json_parse(request.headers.get("x-model-params", "{}")),
            "training_dataset": request.headers.get("x-training-dataset", "unknown"),
            "last_retrained": request.headers.get("x-last-retrained", "unknown"),
        }

    def _extract_inference_params(self, request: Request) -> dict[str, Any]:
        """Extract inference parameters from request headers."""
        return {
            "temperature": float(request.headers.get("x-temperature", "1.0")),
            "top_k": int(request.headers.get("x-top-k", "5")),
            "threshold": float(request.headers.get("x-threshold", "0.5")),
            "batch_size": int(request.headers.get("x-batch-size", "1")),
            "use_cache": request.headers.get("x-use-cache", "true").lower() == "true",
        }

    def _extract_feature_flags(self, request: Request) -> dict[str, bool]:
        """Extract active feature flags from request."""
        return {
            "entity_resolution_enabled": request.headers.get(
                "x-feature-entity-resolution", "false"
            ).lower()
            == "true",
            "link_scoring_enabled": request.headers.get("x-feature-link-scoring", "false").lower()
            == "true",
            "drift_detection_enabled": request.headers.get(
                "x-feature-drift-detection", "false"
            ).lower()
            == "true",
            "xai_enabled": request.headers.get("x-feature-xai", "true").lower() == "true",
        }

    async def _capture_input_features(self, request: Request) -> dict[str, Any]:
        """Capture input features for explainability (PII-safe)."""
        try:
            # Only capture feature metadata, not raw content
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                return {
                    "feature_count": request.headers.get("x-feature-count", "unknown"),
                    "feature_types": self._safe_json_parse(
                        request.headers.get("x-feature-types", "[]")
                    ),
                    "feature_hash": request.headers.get("x-feature-hash", "unknown"),
                    "data_source": request.headers.get("x-data-source", "unknown"),
                }
        except Exception as e:
            return {"error": f"Feature capture failed: {str(e)}"}

        return {}

    async def _extract_inference_results(self, response: Response) -> dict[str, Any]:
        """Extract inference results from response (metadata only)."""
        try:
            return {
                "result_type": response.headers.get("x-result-type", "unknown"),
                "result_count": int(response.headers.get("x-result-count", "0")),
                "processing_time_ms": float(response.headers.get("x-processing-time", "0")),
                "cache_hit": response.headers.get("x-cache-hit", "false").lower() == "true",
                "model_version_used": response.headers.get("x-model-version-used", "unknown"),
            }
        except Exception:
            return {}

    async def _extract_confidence_scores(self, response: Response) -> dict[str, float]:
        """Extract confidence scores from response headers."""
        try:
            return {
                "average": float(response.headers.get("x-confidence-average", "0.0")),
                "min": float(response.headers.get("x-confidence-min", "0.0")),
                "max": float(response.headers.get("x-confidence-max", "0.0")),
                "std_dev": float(response.headers.get("x-confidence-std", "0.0")),
            }
        except Exception:
            return {"average": 0.0, "min": 0.0, "max": 0.0, "std_dev": 0.0}

    async def _calculate_feature_importance(
        self, input_features: dict[str, Any], inference_results: dict[str, Any]
    ) -> dict[str, Any]:
        """Calculate feature importance scores (simulated for MVP)."""
        # In production, this would use SHAP, LIME, or integrated gradients
        # For now, return placeholder structure
        return {
            "method": "simulated_importance",
            "top_features": [
                {"name": "entity_type", "importance": 0.45, "direction": "positive"},
                {"name": "similarity_score", "importance": 0.32, "direction": "positive"},
                {"name": "temporal_proximity", "importance": 0.23, "direction": "positive"},
            ],
            "global_importance_available": False,
            "local_importance_available": True,
        }

    async def _store_audit_record(self, artifact_id: str, record: dict[str, Any]) -> None:
        """Store audit record to persistent storage."""
        try:
            # Check size limits
            record_size = len(json.dumps(record).encode("utf-8"))
            if record_size > self.max_artifact_size_mb * 1024 * 1024:
                record = self._truncate_record(record)

            # Store main audit record
            artifact_path = self.store_path / f"{artifact_id}.json"
            with open(artifact_path, "w") as f:
                json.dump(record, f, indent=2, default=str)

            # Store model card snapshot if available
            model_card_path = self.store_path / f"{artifact_id}_model_card.json"
            model_card = await self._generate_model_card_snapshot(record)
            with open(model_card_path, "w") as f:
                json.dump(model_card, f, indent=2)

            # Cleanup old artifacts
            await self._cleanup_old_artifacts()

        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to store audit record {artifact_id}: {e}")

    async def _generate_model_card_snapshot(self, record: dict[str, Any]) -> dict[str, Any]:
        """Generate model card snapshot for this inference."""
        return {
            "model_details": record.get("model_metadata", {}),
            "inference_timestamp": record.get("timestamp"),
            "inference_params": record.get("inference_params", {}),
            "performance_metrics": {
                "latency_ms": record.get("duration_ms", 0),
                "confidence": record.get("confidence_scores", {}).get("average", 0),
                "cache_efficiency": record.get("inference_results", {}).get("cache_hit", False),
            },
            "feature_flags": record.get("feature_flags", {}),
            "explanation_availability": {
                "feature_importance": True,
                "counterfactual_examples": False,
                "decision_boundary": False,
                "uncertainty_quantification": True,
            },
        }

    async def _cleanup_old_artifacts(self) -> None:
        """Clean up artifacts older than retention period."""
        try:
            cutoff_time = time.time() - (self.retention_days * 24 * 3600)
            for artifact_file in self.store_path.glob("*.json"):
                if artifact_file.stat().st_mtime < cutoff_time:
                    artifact_file.unlink()
        except Exception as e:
            print(f"Artifact cleanup failed: {e}")

    def _truncate_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """Truncate record to fit size limits."""
        # Remove large fields while preserving audit trail
        truncated = record.copy()

        # Remove or truncate large fields
        if "input_features" in truncated:
            truncated["input_features"] = {"truncated": True, "reason": "size_limit"}

        if "inference_results" in truncated:
            truncated["inference_results"] = {**truncated["inference_results"], "truncated": True}

        return truncated

    def _safe_json_parse(self, json_str: str) -> dict[str, Any]:
        """Safely parse JSON string with fallback."""
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError):
            return {"error": "invalid_json", "raw": json_str[:100]}
