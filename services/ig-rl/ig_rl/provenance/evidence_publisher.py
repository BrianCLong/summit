"""Evidence publisher integration for Maestro Conductor GraphQL."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, Mapping, MutableMapping, Optional

import httpx

from .logger import ProvenanceRecord


EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
DEFAULT_RELEASE_LABEL_KEYS = (
    "intelgraph.io/release-id",
    "intelgraph.io/releaseId",
    "releaseId",
    "app.kubernetes.io/version",
    "rollouts.kubernetes.io/revision",
)

PUBLISH_EVIDENCE_MUTATION = """
mutation PublishEvidence($input: PublishEvidenceInput!) {
  publishEvidence(input: $input) {
    evidenceId
    releaseId
  }
}
""".strip()

EVIDENCE_OK_QUERY = """
query EvidenceOk($releaseId: ID!) {
  evidenceOk(releaseId: $releaseId) {
    ok
    details
  }
}
""".strip()


@dataclass(slots=True)
class SLOMetrics:
    """Latency, reliability, and cost metrics captured for a release."""

    latency_p95: float
    latency_p99: float
    error_rate: float
    unit_cost: float


@dataclass(slots=True)
class ArtifactDigests:
    """Immutable digests for release artifacts."""

    sbom_sha256: str
    test_results_sha256: str


@dataclass(slots=True)
class PublishResult:
    """Result returned after publishing evidence to Maestro Conductor."""

    evidence_id: str
    release_id: str
    ok: bool
    details: Dict[str, Any]


class EvidencePublishError(RuntimeError):
    """Raised when the evidence publisher cannot write to Maestro Conductor."""


class KubernetesReleaseInspector:
    """Derives the release identifier from Kubernetes pod and rollout labels."""

    def __init__(
        self,
        *,
        pod_labels: Optional[Mapping[str, str] | str] = None,
        rollout_labels: Optional[Mapping[str, str] | str] = None,
        env: Optional[Mapping[str, str]] = None,
        label_keys: tuple[str, ...] = DEFAULT_RELEASE_LABEL_KEYS,
    ) -> None:
        self._env = env or os.environ
        self._label_keys = label_keys
        self._pod_labels_raw = pod_labels if pod_labels is not None else self._read_env_labels(
            "K8S_POD_LABELS", "POD_LABELS", "MC_POD_LABELS"
        )
        self._rollout_labels_raw = (
            rollout_labels
            if rollout_labels is not None
            else self._read_env_labels("K8S_ROLLOUT_LABELS", "ROLLOUT_LABELS", "MC_ROLLOUT_LABELS")
        )
        self._release_id: Optional[str] = None

    def _read_env_labels(self, *keys: str) -> str:
        for key in keys:
            value = self._env.get(key)
            if value:
                return value
        return ""

    @staticmethod
    def _parse(labels: Mapping[str, str] | str | None) -> Dict[str, str]:
        if labels is None:
            return {}
        if isinstance(labels, Mapping):
            return dict(labels)
        parsed: Dict[str, str] = {}
        for pair in labels.split(","):
            if not pair:
                continue
            key, _, value = pair.partition("=")
            if key:
                parsed[key.strip()] = value.strip()
        return parsed

    def release_id(self) -> str:
        if self._release_id:
            return self._release_id

        pod_labels = self._parse(self._pod_labels_raw)
        rollout_labels = self._parse(self._rollout_labels_raw)
        for key in self._label_keys:
            if key in pod_labels and pod_labels[key]:
                self._release_id = pod_labels[key]
                return self._release_id
        for key in self._label_keys:
            if key in rollout_labels and rollout_labels[key]:
                self._release_id = rollout_labels[key]
                return self._release_id
        raise EvidencePublishError("Unable to determine releaseId from Kubernetes labels")


class EnvironmentMetricsSource:
    """Reads latency, error rate, and unit cost metrics from environment variables."""

    def __init__(self, env: Optional[Mapping[str, str]] = None) -> None:
        self._env = env or os.environ

    async def __call__(self, release_id: str) -> SLOMetrics:  # pragma: no cover - simple env reader
        return SLOMetrics(
            latency_p95=float(self._env.get("MC_SLO_LATENCY_P95", "0")),
            latency_p99=float(self._env.get("MC_SLO_LATENCY_P99", "0")),
            error_rate=float(self._env.get("MC_SLO_ERROR_RATE", "0")),
            unit_cost=float(self._env.get("MC_UNIT_COST", "0")),
        )


class EnvironmentArtifactSource:
    """Reads artifact digests (SBOM + test reports) from environment variables."""

    def __init__(self, env: Optional[Mapping[str, str]] = None) -> None:
        self._env = env or os.environ

    async def __call__(self, release_id: str) -> ArtifactDigests:  # pragma: no cover - simple env reader
        return ArtifactDigests(
            sbom_sha256=self._env.get("MC_SBOM_SHA256", ""),
            test_results_sha256=self._env.get("MC_TEST_RESULTS_SHA256", ""),
        )


class MCEvidencePublisher:
    """Publishes provenance evidence bundles to Maestro Conductor GraphQL."""

    def __init__(
        self,
        endpoint: str,
        *,
        token: Optional[str] = None,
        metrics_provider: Optional[Callable[[str], Awaitable[SLOMetrics]]] = None,
        artifact_provider: Optional[Callable[[str], Awaitable[ArtifactDigests]]] = None,
        release_inspector: Optional[KubernetesReleaseInspector] = None,
        transport: Optional[httpx.BaseTransport] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        retry_backoff_seconds: float = 0.5,
        verify_after_publish: bool = True,
    ) -> None:
        self._endpoint = endpoint
        self._token = token
        self._metrics_provider = metrics_provider or EnvironmentMetricsSource()
        self._artifact_provider = artifact_provider or EnvironmentArtifactSource()
        self._release_inspector = release_inspector or KubernetesReleaseInspector()
        self._transport = transport
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_backoff = retry_backoff_seconds
        self._verify_after_publish = verify_after_publish

    async def publish(self, record: ProvenanceRecord) -> PublishResult:
        release_id = self._release_inspector.release_id()
        metrics = await self._metrics_provider(release_id)
        artifacts = await self._artifact_provider(release_id)

        payload = self._build_payload(record, release_id, metrics, artifacts)
        sanitized_payload = self._sanitize(payload)
        idempotency_key = self._compute_idempotency_key(record, artifacts)

        response_data = await self._execute_with_retries(
            {
                "query": PUBLISH_EVIDENCE_MUTATION,
                "variables": {"input": sanitized_payload},
            },
            idempotency_key=idempotency_key,
        )

        try:
            publish_node = response_data["publishEvidence"]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise EvidencePublishError("Malformed response from publishEvidence mutation") from exc

        ok = False
        details: Dict[str, Any] = {}
        if self._verify_after_publish:
            ok, details = await self.evidence_ok(release_id)

        return PublishResult(
            evidence_id=publish_node.get("evidenceId", ""),
            release_id=publish_node.get("releaseId", release_id),
            ok=ok,
            details=details,
        )

    async def evidence_ok(self, release_id: str) -> tuple[bool, Dict[str, Any]]:
        response_data = await self._execute_with_retries(
            {
                "query": EVIDENCE_OK_QUERY,
                "variables": {"releaseId": release_id},
            }
        )
        node = response_data.get("evidenceOk", {})
        return bool(node.get("ok", False)), node.get("details", {})

    async def _execute_with_retries(
        self,
        payload: MutableMapping[str, Any],
        *,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        attempt = 0
        last_error: Optional[Exception] = None
        while attempt < self._max_retries:
            try:
                async with httpx.AsyncClient(timeout=self._timeout, transport=self._transport) as client:
                    response = await client.post(self._endpoint, json=payload, headers=headers)
                response.raise_for_status()
                body = response.json()
                if "errors" in body:
                    raise EvidencePublishError(f"GraphQL errors: {body['errors']}")
                data = body.get("data")
                if not isinstance(data, dict):
                    raise EvidencePublishError("GraphQL response missing data")
                return data
            except (httpx.HTTPError, EvidencePublishError) as exc:
                last_error = exc
                attempt += 1
                if attempt >= self._max_retries:
                    break
                await asyncio.sleep(self._retry_backoff * (2 ** (attempt - 1)))
        raise EvidencePublishError("Failed to publish evidence") from last_error

    @staticmethod
    def _sanitize(payload: Dict[str, Any]) -> Dict[str, Any]:
        def scrub(value: Any) -> Any:
            if isinstance(value, str):
                if EMAIL_PATTERN.search(value) or SSN_PATTERN.search(value):
                    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
                    return f"sha256:{digest}"
                return value
            if isinstance(value, Mapping):
                return {k: scrub(v) for k, v in value.items()}
            if isinstance(value, list):
                return [scrub(item) for item in value]
            return value

        return scrub(payload)

    @staticmethod
    def _build_payload(
        record: ProvenanceRecord,
        release_id: str,
        metrics: SLOMetrics,
        artifacts: ArtifactDigests,
    ) -> Dict[str, Any]:
        return {
            "releaseId": release_id,
            "recordedAt": datetime.now(tz=timezone.utc).isoformat(),
            "artifacts": [
                {"type": "sbom", "hash": artifacts.sbom_sha256},
                {"type": "test", "hash": artifacts.test_results_sha256},
            ],
            "metrics": {
                "latencyP95": metrics.latency_p95,
                "latencyP99": metrics.latency_p99,
                "errorRate": metrics.error_rate,
                "unitCost": metrics.unit_cost,
            },
            "provenance": {
                "decisionId": record.decision_id,
                "caseId": record.case_id,
                "action": record.action,
                "reward": record.reward,
                "rewardComponents": record.reward_components,
                "modelHash": record.model_hash,
                "stateHash": record.state_hash,
            },
        }

    @staticmethod
    def _compute_idempotency_key(record: ProvenanceRecord, artifacts: ArtifactDigests) -> str:
        material = json.dumps(
            {
                "decisionId": record.decision_id,
                "caseId": record.case_id,
                "modelHash": record.model_hash,
                "stateHash": record.state_hash,
                "sbom": artifacts.sbom_sha256,
                "tests": artifacts.test_results_sha256,
            },
            sort_keys=True,
        )
        return hashlib.sha256(material.encode("utf-8")).hexdigest()


__all__ = [
    "ArtifactDigests",
    "EnvironmentArtifactSource",
    "EnvironmentMetricsSource",
    "EvidencePublishError",
    "KubernetesReleaseInspector",
    "MCEvidencePublisher",
    "PublishResult",
    "SLOMetrics",
]
